"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, Trash2, Package2 } from "lucide-react";
import * as XLSX from 'xlsx';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// SalesItem tipini doğrudan burada tanımlayalım
interface SalesItem {
  Marka: string;
  "Ürün Grubu": string;
  "Ürün Kodu": string;
  "Renk Kodu": string;
  Beden: string;
  Envanter: string | number;
  Sezon: string;
  "Satış Miktarı": string | number;
  "Satış (VD)": string | number;
}

export default function SalesPage() {
  const [salesData, setSalesData] = useState<SalesItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterField, setFilterField] = useState<keyof SalesItem | "">("");
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      let allData: SalesItem[] = [];
      const pageSize = 1000;

      // Önce toplam kayıt sayısını alalım
      const { count, error: countError } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Count error:', countError);
        throw new Error(`Veri sayısı alınırken hata oluştu: ${countError.message}`);
      }

      if (!count) {
        setSalesData([]);
        return;
      }

      // Kaç sayfa olacağını hesaplayalım
      const totalPages = Math.ceil(count / pageSize);
      
      // Tüm sayfaları paralel olarak çekelim
      const pagePromises = Array.from({ length: totalPages }, (_, index) =>
        supabase
          .from('sales')
          .select('*')
          .range(index * pageSize, (index + 1) * pageSize - 1)
      );

      try {
        const results = await Promise.all(pagePromises);

        // Hata kontrolü yapalım
        const errorResult = results.find(result => result.error);
        if (errorResult) {
          console.error('Data fetch error:', errorResult.error);
          throw new Error(`Veri çekerken hata oluştu: ${errorResult.error.message}`);
        }

        // Tüm verileri birleştirelim
        allData = results.flatMap(result => result.data || []);

        console.log('Toplam yüklenen veri sayısı:', allData.length);
        console.log('Beklenen veri sayısı:', count);
        setSalesData(allData);
      } catch (error) {
        console.error('Promise.all error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in fetchSalesData:', error);
      toast.error(error instanceof Error ? error.message : 'Satış verilerini getirirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = e.target?.result;
            if (!data) {
              throw new Error('Dosya okunamadı');
            }

            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as SalesItem[];

            if (jsonData.length === 0) {
              throw new Error('Excel dosyası boş veya uyumsuz format');
            }

            console.log('Yüklenecek veri:', jsonData[0]); // İlk kaydı kontrol için logla
            
            // Supabase'e veri yükleme
            const { error } = await supabase
              .from('sales')
              .insert(jsonData);

            if (error) {
              console.error('Supabase insert error:', error);
              throw new Error(`Veri yükleme hatası: ${error.message}`);
            }

            toast.success('Veriler başarıyla yüklendi');
            fetchSalesData(); // Tabloyu güncelle
          } catch (error) {
            console.error('File processing error:', error);
            toast.error(error instanceof Error ? error.message : 'Dosya işlenirken bir hata oluştu');
          }
        };

        reader.onerror = (error) => {
          console.error('FileReader error:', error);
          toast.error('Dosya okuma hatası');
        };

        reader.readAsBinaryString(file);
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(error instanceof Error ? error.message : 'Dosya yüklenirken bir hata oluştu');
      }
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Tüm satış verilerini silmek istediğinize emin misiniz?')) {
      try {
        const { error } = await supabase
          .from('sales')
          .delete()
          .not('id', 'is', null);

        if (error) {
          console.error('Delete error:', error);
          throw new Error(`Veri silme hatası: ${error.message}`);
        }

        setSalesData([]);
        toast.success('Tüm veriler başarıyla silindi');
      } catch (error) {
        console.error('Clear data error:', error);
        toast.error(error instanceof Error ? error.message : 'Veriler silinirken bir hata oluştu');
      }
    }
  };

  const getFilteredData = () => {
    return salesData.filter((item) => {
      // Genel arama
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return Object.values(item).some(
          (value) => value != null && value.toString().toLowerCase().includes(searchLower)
        );
      }
      
      // Spesifik alan filtresi
      if (filterField && filterValue) {
        const itemValue = item[filterField];
        return itemValue != null && itemValue.toString().toLowerCase().includes(filterValue.toLowerCase());
      }
      
      return true;
    });
  };

  const filteredData = getFilteredData();

  const filterOptions = [
    { value: 'none', label: 'Filtre Seçin' },
    { value: 'Marka', label: 'Marka' },
    { value: 'Ürün Grubu', label: 'Ürün Grubu' },
    { value: 'Ürün Kodu', label: 'Ürün Kodu' },
    { value: 'Renk Kodu', label: 'Renk Kodu' },
    { value: 'Beden', label: 'Beden' },
    { value: 'Sezon', label: 'Sezon' },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
        <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Package2 className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold">Satış Verileri Yükleniyor</h2>
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
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Satış Analiz</h1>
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
          {salesData.length > 0 && (
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

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select 
            value={filterField || 'none'} 
            onValueChange={(value) => setFilterField(value === 'none' ? '' : value as keyof SalesItem)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtre seçin" />
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

      <Card>
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
                  <TableHead className="w-[100px]">Sezon</TableHead>
                  <TableHead className="w-[120px]">Satış Miktarı</TableHead>
                  <TableHead className="w-[150px]">Satış (VD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.Marka}</TableCell>
                    <TableCell>{item["Ürün Grubu"]}</TableCell>
                    <TableCell>{item["Ürün Kodu"]}</TableCell>
                    <TableCell>{item["Renk Kodu"]}</TableCell>
                    <TableCell>{item.Beden}</TableCell>
                    <TableCell>{item.Envanter}</TableCell>
                    <TableCell>{item.Sezon}</TableCell>
                    <TableCell>{item["Satış Miktarı"]}</TableCell>
                    <TableCell>{item["Satış (VD)"]}</TableCell>
                  </TableRow>
                ))}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-[450px] text-center text-muted-foreground">
                      {salesData.length === 0
                        ? "Excel dosyası yükleyerek satış verilerini görüntüleyebilirsiniz."
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
  );
} 