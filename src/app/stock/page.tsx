"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileSpreadsheet, Search, Trash2, Package2 } from "lucide-react"
import * as XLSX from 'xlsx'
import { useStockStore } from "@/store/useStockStore"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StockItem } from "@/types/stock"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function StockPage() {
  const [stockData, setStockData] = useState<StockItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterField, setFilterField] = useState<keyof StockItem | "">("")
  const [filterValue, setFilterValue] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStockData()
  }, [])

  const fetchStockData = async () => {
    try {
      let allData: StockItem[] = [];
      const pageSize = 1000;

      // Önce toplam kayıt sayısını alalım
      const { count, error: countError } = await supabase
        .from('stock')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      if (!count) {
        setStockData([]);
        return;
      }

      // Kaç sayfa olacağını hesaplayalım
      const totalPages = Math.ceil(count / pageSize);
      
      // Tüm sayfaları paralel olarak çekelim
      const pagePromises = Array.from({ length: totalPages }, (_, index) =>
        supabase
          .from('stock')
          .select('*')
          .range(index * pageSize, (index + 1) * pageSize - 1)
      );

      const results = await Promise.all(pagePromises);

      // Hata kontrolü yapalım
      const hasError = results.some(result => result.error);
      if (hasError) {
        throw new Error('Veri çekerken hata oluştu');
      }

      // Tüm verileri birleştirelim
      allData = results.flatMap(result => result.data || []);

      console.log('Toplam yüklenen veri sayısı:', allData.length);
      console.log('Beklenen veri sayısı:', count);
      setStockData(allData);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Stok verilerini getirirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const reader = new FileReader()
        reader.onload = async (e) => {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as StockItem[]
          
          // Supabase'e veri yükleme
          const { error } = await supabase
            .from('stock')
            .insert(jsonData)

          if (error) throw error

          toast.success('Veriler başarıyla yüklendi')
          fetchStockData() // Tabloyu güncelle
        }
        reader.readAsBinaryString(file)
      } catch (error) {
        console.error('Error uploading file:', error)
        toast.error('Dosya yüklenirken bir hata oluştu')
      }
    }
  }

  const handleClearData = async () => {
    if (window.confirm('Tüm stok verilerini silmek istediğinize emin misiniz?')) {
      try {
        const { error } = await supabase
          .from('stock')
          .delete()
          .not('id', 'is', null) // Tüm kayıtları silmek için doğru koşul

        if (error) throw error

        setStockData([])
        toast.success('Tüm veriler başarıyla silindi')
      } catch (error) {
        console.error('Error clearing data:', error)
        toast.error('Veriler silinirken bir hata oluştu')
      }
    }
  }

  const getFilteredData = () => {
    return stockData.filter((item) => {
      // Genel arama
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        return Object.values(item).some(
          (value) => value != null && value.toString().toLowerCase().includes(searchLower)
        )
      }
      
      // Spesifik alan filtresi
      if (filterField && filterValue) {
        const itemValue = item[filterField]
        return itemValue != null && itemValue.toString().toLowerCase().includes(filterValue.toLowerCase())
      }
      
      return true
    })
  }

  const filteredData = getFilteredData()

  const filterOptions = [
    { value: 'none', label: 'Filtre Seçin' },
    { value: 'Marka', label: 'Marka' },
    { value: 'Ürün Grubu', label: 'Ürün Grubu' },
    { value: 'Ürün Kodu', label: 'Ürün Kodu' },
    { value: 'Renk Kodu', label: 'Renk Kodu' },
    { value: 'Beden', label: 'Beden' },
    { value: 'Barkod', label: 'Barkod' },
    { value: 'Sezon', label: 'Sezon' },
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
        <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Package2 className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold">Stok Verileri Yükleniyor</h2>
            <div className="flex w-full max-w-md items-center space-x-2">
              <div className="h-2 w-full rounded-full bg-secondary">
                <div className="h-full w-1/3 rounded-full bg-primary animate-[loading_1s_ease-in-out_infinite]" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Veriler hazırlanıyor...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stok Sorgula</h1>
        <div className="flex gap-2">
          <input
            type="file"
            id="excel-upload"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label htmlFor="excel-upload">
            <Button variant="outline" className="gap-2" asChild>
              <span>
                <FileSpreadsheet className="h-4 w-4" />
                Excel Dosyası Yükle
              </span>
            </Button>
          </label>
          {stockData.length > 0 && (
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={handleClearData}
            >
              <Trash2 className="h-4 w-4" />
              Verileri Temizle
            </Button>
          )}
        </div>
      </div>

      {stockData.length > 0 && (
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tüm alanlarda ara..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={filterField || 'none'}
              onValueChange={(value: string) => setFilterField(value === 'none' ? '' : value as keyof StockItem)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtre Seçin" />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterField && (
              <Input
                placeholder="Filtre değeri..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-[200px]"
              />
            )}
          </div>
        </div>
      )}

      <Card className="mt-4">
        <ScrollArea className="h-[600px] rounded-md">
          <div className="relative">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[150px]">Marka</TableHead>
                  <TableHead className="w-[150px]">Ürün Grubu</TableHead>
                  <TableHead className="w-[150px]">Ürün Kodu</TableHead>
                  <TableHead className="w-[150px]">Renk Kodu</TableHead>
                  <TableHead className="w-[100px]">Beden</TableHead>
                  <TableHead className="w-[100px]">Envanter</TableHead>
                  <TableHead className="w-[150px]">Barkod</TableHead>
                  <TableHead className="w-[100px]">Sezon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{item.Marka}</TableCell>
                    <TableCell>{item["Ürün Grubu"]}</TableCell>
                    <TableCell>{item["Ürün Kodu"]}</TableCell>
                    <TableCell>{item["Renk Kodu"]}</TableCell>
                    <TableCell>{item.Beden}</TableCell>
                    <TableCell>{item.Envanter}</TableCell>
                    <TableCell>{item.Barkod}</TableCell>
                    <TableCell>{item.Sezon}</TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-[450px] text-center text-muted-foreground">
                      {stockData.length === 0
                        ? "Excel dosyası yükleyerek stok verilerini görüntüleyebilirsiniz."
                        : "Arama kriterlerine uygun sonuç bulunamadı."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
} 