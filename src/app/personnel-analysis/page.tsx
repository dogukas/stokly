"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ResponsivePie } from "@nivo/pie";
import { Package2, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { TopProductsList } from "./top-products";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Excel verisi için tip tanımı
interface SalesData {
  personelAdi: string;
  marka: string;
  urunKodu: string;
  renkKodu: string;
  satisAdeti: number;
  satisFiyati: number;
}

// Excel row tipi
interface ExcelRow {
  personelAdi: string | number;
  marka: string | number;
  urunKodu: string | number;
  renkKodu: string | number;
  satisAdeti: string | number;
  satisFiyati: string | number;
}

// Supabase veri tipi
interface SupabaseSalesData {
  personel_adi: string;
  marka: string;
  urun_kodu: string;
  renk_kodu: string;
  satis_adeti: number;
  satis_fiyati: number;
}

export default function PersonnelAnalysisPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  // Use effect to load data from Supabase
  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    try {
      let allData: SalesData[] = [];
      const pageSize = 1000;

      const { count, error: countError } = await supabase
        .from('personnel_sales')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Count error:', countError);
        throw new Error(`Veri sayısı alınırken hata oluştu: ${countError.message}`);
      }

      if (!count) {
        setSalesData([]);
        setLoading(false);
        return;
      }

      const totalPages = Math.ceil(count / pageSize);
      
      const pagePromises = Array.from({ length: totalPages }, (_, index) =>
        supabase
          .from('personnel_sales')
          .select('*')
          .range(index * pageSize, (index + 1) * pageSize - 1)
      );

      const results = await Promise.all(pagePromises);

      const errorResult = results.find(result => result.error);
      if (errorResult?.error) {
        console.error('Data fetch error:', errorResult.error);
        throw new Error(`Veri çekerken hata oluştu: ${errorResult.error.message}`);
      }

      allData = results.flatMap(result => result.data || []).map(item => ({
        personelAdi: item.personel_adi,
        marka: item.marka,
        urunKodu: item.urun_kodu,
        renkKodu: item.renk_kodu,
        satisAdeti: Number(item.satis_adeti),
        satisFiyati: Number(item.satis_fiyati)
      }));

      setSalesData(allData);
    } catch (error) {
      console.error('Error in fetchSalesData:', error);
      toast.error(error instanceof Error ? error.message : 'Personel satış verilerini getirirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Excel dosyasını işleme fonksiyonu
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
            
            // Verileri doğru formata dönüştür
            const formattedData: SupabaseSalesData[] = rawData.map(row => ({
              personel_adi: String(row.personelAdi || ''),
              marka: String(row.marka || ''),
              urun_kodu: String(row.urunKodu || ''),
              renk_kodu: String(row.renkKodu || ''),
              satis_adeti: Number(row.satisAdeti) || 0,
              satis_fiyati: Number(row.satisFiyati) || 0
            }));

            // Supabase'e kaydet
            const { error } = await supabase
              .from('personnel_sales')
              .insert(formattedData);

            if (error) {
              throw new Error(`Veri yükleme hatası: ${error.message}`);
            }

            toast.success('Veriler başarıyla yüklendi');
            fetchSalesData(); // Verileri yeniden yükle
          } catch (error) {
            console.error('File processing error:', error);
            toast.error(error instanceof Error ? error.message : 'Dosya işlenirken bir hata oluştu');
          }
        };
        reader.readAsBinaryString(file);
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(error instanceof Error ? error.message : 'Dosya yüklenirken bir hata oluştu');
      }
    }
  };

  // Verileri temizleme fonksiyonu
  const handleClearData = async () => {
    if (window.confirm('Tüm veriler silinecek. Emin misiniz?')) {
      try {
        const { error } = await supabase
          .from('personnel_sales')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Tüm kayıtları sil

        if (error) {
          throw new Error(`Veri silme hatası: ${error.message}`);
        }

        setSalesData([]);
        toast.success('Tüm veriler başarıyla silindi');
      } catch (error) {
        console.error('Error clearing data:', error);
        toast.error(error instanceof Error ? error.message : 'Veriler silinirken bir hata oluştu');
      }
    }
  };

  // İstatistikleri hesaplama
  const statistics = {
    totalSales: salesData.reduce((sum, item) => sum + (Number(item.satisFiyati) || 0), 0),
    totalQuantity: salesData.reduce((sum, item) => sum + (Number(item.satisAdeti) || 0), 0),
    topBrand: (() => {
      const brandCounts = salesData.reduce((acc, item) => {
        const count = Number(item.satisAdeti) || 0;
        acc[item.marka] = (acc[item.marka] || 0) + count;
        return acc;
      }, {} as Record<string, number>);
      
      return Object.entries(brandCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || '-';
    })(),
  };

  // Marka bazlı satış dağılımı
  const brandDistribution = salesData.reduce((acc, item) => {
    acc[item.marka] = (acc[item.marka] || 0) + item.satisAdeti;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(brandDistribution)
    .filter(([brand, count]) => brand && count > 0)
    .map(([brand, count]) => ({
      id: brand,
      label: brand,
      value: count
    }));

  // Personel bazlı satış performansı
  const personnelPerformance = salesData.reduce((acc, item) => {
    const personelAdi = item.personelAdi;
    if (!acc[personelAdi]) {
      acc[personelAdi] = {
        totalSales: 0,
        totalQuantity: 0
      };
    }
    acc[personelAdi].totalSales += Number(item.satisFiyati) || 0;
    acc[personelAdi].totalQuantity += Number(item.satisAdeti) || 0;
    return acc;
  }, {} as Record<string, { totalSales: number; totalQuantity: number }>);

  const performanceBarData = Object.entries(personnelPerformance)
    .filter(([name, data]) => name && (data.totalSales > 0 || data.totalQuantity > 0))
    .map(([name, data]) => ({
      name,
      "Satış Tutarı": Math.round(data.totalSales * 100) / 100,
      "Satış Adedi": data.totalQuantity
    }));

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
        <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Package2 className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold">Personel Verileri Yükleniyor</h2>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 md:mb-0 text-center md:text-left">Personel Analiz Raporu</h1>
        <div className="flex gap-4">
          <Button onClick={() => document.getElementById('fileInput')?.click()} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="mr-2 h-4 w-4" />
            Excel Yükle
          </Button>
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          {salesData.length > 0 && (
            <Button variant="destructive" onClick={handleClearData} className="hover:bg-red-700">
              <Package2 className="mr-2 h-4 w-4" />
              Verileri Temizle
            </Button>
          )}
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="overflow-hidden border-t-4 border-blue-500 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 justify-center">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              </div>
              Toplam Satış Tutarı
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">Tüm satışların toplam değeri</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <span className="text-3xl font-bold text-blue-700">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
                  .format(statistics.totalSales)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-green-500 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 justify-center">
              <div className="p-2 bg-green-100 text-green-700 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
              </div>
              Toplam Satış Adedi
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">Satılan toplam ürün sayısı</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <span className="text-3xl font-bold text-green-700">{new Intl.NumberFormat('tr-TR').format(statistics.totalQuantity)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-t-4 border-purple-500 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 justify-center">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
              </div>
              En Çok Satan Marka
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">Ciroya göre en çok satan markalar</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 mx-auto">
              {(() => {
                // Marka bazlı ciro dağılımı hesapla
                const brandSalesAmount = salesData.reduce((acc, item) => {
                  const brand = item.marka;
                  const salesAmount = Number(item.satisFiyati) || 0;
                  
                  if (!acc[brand]) {
                    acc[brand] = {
                      totalAmount: 0,
                      totalQuantity: 0
                    };
                  }
                  
                  acc[brand].totalAmount += salesAmount;
                  acc[brand].totalQuantity += Number(item.satisAdeti) || 0;
                  
                  return acc;
                }, {} as Record<string, { totalAmount: number; totalQuantity: number }>);
                
                // Ciro bazında sırala ve ilk 3'ü al
                const topBrands = Object.entries(brandSalesAmount)
                  .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
                  .slice(0, 3);
                
                const totalAmount = Object.values(brandSalesAmount).reduce((sum, data) => sum + data.totalAmount, 0);
                
                return topBrands.map(([brand, data], index) => {
                  const percentage = (data.totalAmount / totalAmount) * 100;
                  
                  return (
                    <div key={brand} className="flex flex-col p-2 rounded-md hover:bg-purple-50 group border border-purple-100 transition-colors w-full">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full ${index === 0 ? 'bg-purple-600' : index === 1 ? 'bg-purple-500' : 'bg-purple-400'} text-white`}>
                            <span className="text-xs font-bold">{index + 1}</span>
                          </div>
                          <span className="font-medium group-hover:text-purple-700 transition-colors">{brand}</span>
                        </div>
                      </div>
                      <div className="ml-8 flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Toplam Ciro:</span>
                          <span className="font-bold text-purple-700">
                            {new Intl.NumberFormat('tr-TR', { 
                              style: 'currency', 
                              currency: 'TRY',
                              maximumFractionDigits: 0 
                            }).format(data.totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Toplam Adet:</span>
                          <span className="font-bold text-purple-600">
                            {new Intl.NumberFormat('tr-TR').format(data.totalQuantity)} adet
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <div className="text-right text-xs text-gray-500 mt-0.5">
                          Oran: %{percentage.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Marka Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {pieData.length > 0 ? (
                <ResponsivePie
                  data={pieData}
                  margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  colors={{ scheme: 'paired' }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor="#333333"
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: 'color' }}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                  tooltip={({ datum }) => {
                    // Marka için toplam ciro hesaplaması
                    const brandSales = salesData
                      .filter(item => item.marka === datum.label)
                      .reduce((total, item) => total + item.satisFiyati, 0);
                      
                    return (
                      <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
                        <div className="font-bold mb-2">{datum.label}</div>
                        <div className="text-sm mb-1">
                          Toplam Satış: {new Intl.NumberFormat('tr-TR').format(datum.value)} adet
                        </div>
                        <div className="text-sm mb-1 text-green-600 font-medium">
                          Toplam Ciro: {new Intl.NumberFormat('tr-TR', { 
                            style: 'currency', 
                            currency: 'TRY',
                            maximumFractionDigits: 0 
                          }).format(brandSales)}
                        </div>
                        <div className="text-sm text-primary font-medium">
                          Oran: {((datum.value / statistics.totalQuantity) * 100).toFixed(1)}%
                        </div>
                      </div>
                    )
                  }}
                  legends={[
                    {
                      anchor: 'bottom',
                      direction: 'row',
                      justify: false,
                      translateY: 56,
                      itemsSpacing: 0,
                      itemWidth: 100,
                      itemHeight: 18,
                      itemTextColor: '#999',
                      itemDirection: 'left-to-right',
                      itemOpacity: 1,
                      symbolSize: 18,
                      symbolShape: 'circle'
                    }
                  ]}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Veri yüklenmedi
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Satış Tutarı Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {(() => {
                  const totalAmount = performanceBarData.reduce((sum, item) => sum + item["Satış Tutarı"], 0);
                  return performanceBarData
                    .sort((a, b) => b["Satış Tutarı"] - a["Satış Tutarı"])
                    .map((item, index) => {
                      const percentage = (item["Satış Tutarı"] / totalAmount) * 100;
                      
                      return (
                        <div
                          key={index}
                          className="relative p-4 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors"
                        >
                          {/* Progress bar arka planı */}
                          <div 
                            className="absolute left-0 top-0 h-full bg-primary/5 rounded-lg transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                          
                          {/* İçerik */}
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-sm font-bold">{index + 1}</span>
                              </div>
                              <div>
                                <h3 className="font-medium">{item.name}</h3>
                                <div className="text-sm text-muted-foreground">
                                  {new Intl.NumberFormat('tr-TR').format(item["Satış Adedi"])} adet satış
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <div className="text-xl font-bold text-green-600">
                                  {new Intl.NumberFormat('tr-TR', { 
                                    style: 'currency', 
                                    currency: 'TRY',
                                    maximumFractionDigits: 0 
                                  }).format(item["Satış Tutarı"])}
                                </div>
                                <div className="text-sm font-semibold text-primary">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                })()}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Satış Adedi Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {performanceBarData.length > 0 ? (
                  <ResponsivePie
                    data={performanceBarData.map(item => ({
                      id: item.name,
                      label: item.name,
                      value: item["Satış Adedi"],
                      salesAmount: item["Satış Tutarı"],
                      personelData: salesData.reduce((acc, sale) => {
                        if (sale.personelAdi === item.name) {
                          if (!acc[sale.marka]) {
                            acc[sale.marka] = {
                              quantity: 0,
                              revenue: 0
                            };
                          }
                          acc[sale.marka].quantity += sale.satisAdeti;
                          acc[sale.marka].revenue += sale.satisFiyati;
                        }
                        return acc;
                      }, {} as Record<string, { quantity: number; revenue: number }>),
                      totalSales: item["Satış Tutarı"]
                    }))}
                    margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                    innerRadius={0.5}
                    padAngle={0.7}
                    cornerRadius={3}
                    activeOuterRadiusOffset={8}
                    colors={{ scheme: 'paired' }}
                    borderWidth={1}
                    borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor="#333333"
                    arcLinkLabelsThickness={2}
                    arcLinkLabelsColor={{ from: 'color' }}
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                    tooltip={({ datum }) => {
                      const totalSalesCount = performanceBarData.reduce((sum, item) => sum + item["Satış Adedi"], 0);
                      const percentageOfTotal = ((datum.value / totalSalesCount) * 100).toFixed(1);
                      
                      return (
                        <div className="bg-white p-2 shadow-lg rounded-lg border border-gray-300 max-w-[800px]">
                          <div className="font-bold mb-0.5 text-base">{datum.label}</div>
                          <div className="grid grid-cols-3 gap-1 mb-1">
                            <div className="text-xs p-1 bg-slate-50 rounded">
                              <span className="text-gray-600 block text-[10px]">Toplam Satış:</span>
                              <span className="font-semibold text-xs">{new Intl.NumberFormat('tr-TR').format(datum.value)} adet</span>
                            </div>
                            <div className="text-xs p-1 bg-green-50 rounded">
                              <span className="text-gray-600 block text-[10px]">Satış Oranı:</span>
                              <span className="font-semibold text-xs">{percentageOfTotal}%</span>
                            </div>
                            <div className="text-xs p-1 bg-blue-50 rounded">
                              <span className="text-gray-600 block text-[10px]">Toplam Ciro:</span>
                              <span className="font-semibold text-xs">
                                {new Intl.NumberFormat('tr-TR', { 
                                  style: 'currency', 
                                  currency: 'TRY',
                                  maximumFractionDigits: 0 
                                }).format(datum.data.salesAmount)}
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-gray-200 mt-0.5 pt-0.5">
                            <div className="font-semibold mb-0.5 text-xs">Marka Bazlı Dağılım:</div>
                            <div className="grid grid-cols-2 gap-1">
                              {Object.entries(datum.data.personelData)
                                .sort(([, a], [, b]) => b.quantity - a.quantity)
                                .map(([marka, data]) => (
                                  <div key={marka} className="bg-gray-50 p-1 rounded">
                                    <div className="font-medium text-gray-800 border-b border-gray-200 pb-0.5 mb-0.5 text-xs">{marka}</div>
                                    <div className="grid grid-cols-2 gap-0.5">
                                      <div className="flex justify-between text-[10px] items-center">
                                        <span className="text-gray-600">Satış Adedi:</span>
                                        <span className="ml-0.5 font-medium">{new Intl.NumberFormat('tr-TR').format(data.quantity)} adet</span>
                                      </div>
                                      <div className="flex justify-between text-[10px] items-center">
                                        <span className="text-gray-600">Ciro:</span>
                                        <span className="ml-0.5 font-medium text-green-600">
                                          {new Intl.NumberFormat('tr-TR', { 
                                            style: 'currency', 
                                            currency: 'TRY',
                                            maximumFractionDigits: 0 
                                          }).format(data.revenue)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                    legends={[
                      {
                        anchor: 'bottom',
                        direction: 'row',
                        justify: false,
                        translateY: 56,
                        itemsSpacing: 0,
                        itemWidth: 100,
                        itemHeight: 18,
                        itemTextColor: '#999',
                        itemDirection: 'left-to-right',
                        itemOpacity: 1,
                        symbolSize: 18,
                        symbolShape: 'circle'
                      }
                    ]}
                    valueFormat={value => 
                      new Intl.NumberFormat('tr-TR').format(value)
                    }
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Veri yüklenmedi
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ciro Bazında En İyi 5 Marka</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {(() => {
                    // Markaların ciro bazında hesaplanması ve sıralanması
                    const brandSalesRevenue = salesData.reduce((acc, sale) => {
                      const brand = sale.marka;
                      if (!acc[brand]) {
                        acc[brand] = {
                          quantity: 0,
                          revenue: 0
                        };
                      }
                      acc[brand].quantity += sale.satisAdeti;
                      acc[brand].revenue += sale.satisFiyati;
                      return acc;
                    }, {} as Record<string, { quantity: number; revenue: number }>);
                    
                    // Ciro bazında sıralama ve ilk 5'i alma
                    const sortedBrandsByCiro = Object.entries(brandSalesRevenue)
                      .sort(([, a], [, b]) => b.revenue - a.revenue)
                      .slice(0, 5);

                    return sortedBrandsByCiro.map(([brand, data], index) => {
                      // Bu markanın toplam cirosunun yüzdesi
                      const totalRevenue = Object.values(brandSalesRevenue).reduce((sum, brand) => sum + brand.revenue, 0);
                      const percentage = (data.revenue / totalRevenue) * 100;
                      
                      // Personel bazlı satışlar - hem adet hem ciro bilgisi topluyoruz
                      const personelData = salesData
                        .filter(sale => sale.marka === brand)
                        .reduce((acc, sale) => {
                          if (!acc[sale.personelAdi]) {
                            acc[sale.personelAdi] = {
                              quantity: 0,
                              revenue: 0
                            };
                          }
                          acc[sale.personelAdi].quantity += sale.satisAdeti;
                          acc[sale.personelAdi].revenue += sale.satisFiyati;
                          return acc;
                        }, {} as Record<string, { quantity: number; revenue: number }>);

                      // En çok satan personel (adet bazında)
                      const topSeller = Object.entries(personelData)
                        .sort(([, a], [, b]) => b.quantity - a.quantity)[0];

                      return (
                        <div
                          key={brand}
                          className="relative p-4 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors"
                        >
                          {/* Progress bar arka planı */}
                          <div 
                            className="absolute left-0 top-0 h-full bg-primary/5 rounded-lg transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                          
                          {/* İçerik */}
                          <div className="relative flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <span className="text-sm font-bold">{index + 1}</span>
                                </div>
                                <div>
                                  <h3 className="font-medium">{brand}</h3>
                                  <div className="text-sm text-muted-foreground">
                                    En çok satan: {topSeller[0]} ({new Intl.NumberFormat('tr-TR').format(topSeller[1].quantity)} adet)
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className="text-xl font-bold text-slate-700">
                                  {new Intl.NumberFormat('tr-TR', { 
                                    style: 'currency', 
                                    currency: 'TRY',
                                    maximumFractionDigits: 0 
                                  }).format(data.revenue)}
                                </div>
                                <div className="text-sm font-semibold text-primary">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              {/* Personel Ciro Kartı */}
                              <div className="bg-green-50 p-2 rounded border border-green-100">
                                <div className="text-xs text-gray-600 mb-1">Personel Cirosu</div>
                                <div className="text-base font-bold text-green-600">
                                  {new Intl.NumberFormat('tr-TR', { 
                                    style: 'currency', 
                                    currency: 'TRY',
                                    maximumFractionDigits: 0 
                                  }).format(topSeller[1].revenue)}
                                </div>
                              </div>
                              
                              {/* Toplam Adet Kartı */}
                              <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                <div className="text-xs text-gray-600 mb-1">Toplam Adet</div>
                                <div className="text-base font-bold text-blue-600">
                                  {new Intl.NumberFormat('tr-TR').format(data.quantity)} adet
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* En Çok Satan Ürünler Listeleri */}
      <TopProductsList />
    </div>
  );
} 