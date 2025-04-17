"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsivePie } from "@nivo/pie";
import { Package2, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import * as XLSX from 'xlsx';

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

export default function PersonnelAnalysisPage() {
  // localStorage'dan verileri al veya boş array kullan
  const [salesData, setSalesData] = useState<SalesData[]>(() => {
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('salesData');
      return savedData ? JSON.parse(savedData) : [];
    }
    return [];
  });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Verileri localStorage'a kaydet
  const updateSalesData = (newData: SalesData[]) => {
    setSalesData(newData);
    localStorage.setItem('salesData', JSON.stringify(newData));
  };

  // Excel dosyasını işleme fonksiyonu
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
        
        // Verileri doğru formata dönüştür
        const formattedData = rawData.map(row => ({
          personelAdi: String(row.personelAdi || ''),
          marka: String(row.marka || ''),
          urunKodu: String(row.urunKodu || ''),
          renkKodu: String(row.renkKodu || ''),
          satisAdeti: Number(row.satisAdeti) || 0,
          satisFiyati: Number(row.satisFiyati) || 0
        }));

        updateSalesData(formattedData);
      };
      reader.readAsBinaryString(file);
    }
  };

  // Verileri temizleme fonksiyonu
  const handleClearData = () => {
    if (window.confirm('Tüm veriler silinecek. Emin misiniz?')) {
      updateSalesData([]);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Personel Analiz Raporu</h1>
        <div className="flex gap-4">
          <Button onClick={() => document.getElementById('fileInput')?.click()}>
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
            <Button variant="destructive" onClick={handleClearData}>
              <Package2 className="mr-2 h-4 w-4" />
              Verileri Temizle
            </Button>
          )}
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Toplam Satış Tutarı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
                  .format(statistics.totalSales)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Toplam Satış Adedi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold">{statistics.totalQuantity}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">En Çok Satan Marka</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <span className="text-2xl font-bold">{statistics.topBrand}</span>
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
                  tooltip={({ datum }) => (
                    <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
                      <div className="font-bold mb-2">{datum.label}</div>
                      <div className="text-sm mb-1">
                        Toplam Satış: {new Intl.NumberFormat('tr-TR').format(datum.value)} adet
                      </div>
                      <div className="text-sm text-primary font-medium">
                        Oran: {((datum.value / statistics.totalQuantity) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
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
                              <div className="text-sm text-muted-foreground">
                                Ortalama: {new Intl.NumberFormat('tr-TR', { 
                                  style: 'currency', 
                                  currency: 'TRY',
                                  maximumFractionDigits: 0 
                                }).format(item["Satış Tutarı"] / item["Satış Adedi"])} / adet
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
                      personelData: salesData.reduce((acc, sale) => {
                        if (sale.personelAdi === item.name) {
                          if (!acc[sale.marka]) {
                            acc[sale.marka] = 0;
                          }
                          acc[sale.marka] += sale.satisAdeti;
                        }
                        return acc;
                      }, {} as Record<string, number>)
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
                    tooltip={({ datum }) => (
                      <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
                        <div className="font-bold mb-2">{datum.label}</div>
                        <div className="text-sm mb-1">Toplam Satış: {new Intl.NumberFormat('tr-TR').format(datum.value)}</div>
                        <div className="border-t border-gray-200 mt-2 pt-2">
                          <div className="font-semibold mb-1">Marka Bazlı Dağılım:</div>
                          {Object.entries(datum.data.personelData).map(([marka, adet]) => (
                            <div key={marka} className="flex justify-between text-sm">
                              <span>{marka}:</span>
                              <span className="ml-4 font-medium">{new Intl.NumberFormat('tr-TR').format(adet)} adet</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
              <CardTitle>En Çok Satan 5 Marka</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {(() => {
                    const sortedBrands = Object.entries(brandDistribution)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5);

                    return sortedBrands.map(([brand, quantity], index) => {
                      const percentage = (quantity / statistics.totalQuantity) * 100;
                      const brandDetails = salesData.filter(sale => sale.marka === brand).reduce((acc, sale) => {
                        acc.totalAmount += sale.satisFiyati;
                        if (!acc.personelSales[sale.personelAdi]) {
                          acc.personelSales[sale.personelAdi] = 0;
                        }
                        acc.personelSales[sale.personelAdi] += sale.satisAdeti;
                        return acc;
                      }, { totalAmount: 0, personelSales: {} as Record<string, number> });

                      const topSeller = Object.entries(brandDetails.personelSales)
                        .sort(([,a], [,b]) => b - a)[0];

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
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <span className="text-sm font-bold">{index + 1}</span>
                              </div>
                              <div>
                                <h3 className="font-medium">{brand}</h3>
                                <div className="text-sm text-muted-foreground">
                                  En çok satan: {topSeller?.[0]} ({new Intl.NumberFormat('tr-TR').format(topSeller?.[1] || 0)} adet)
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <div className="text-xl font-bold text-green-600">
                                  {new Intl.NumberFormat('tr-TR').format(quantity)} adet
                                </div>
                                <div className="text-sm font-semibold text-primary">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Ciro: {new Intl.NumberFormat('tr-TR', { 
                                  style: 'currency', 
                                  currency: 'TRY',
                                  maximumFractionDigits: 0 
                                }).format(brandDetails.totalAmount)}
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

      {/* En Çok Satan 5 Ürün */}
      <Card>
        <CardHeader>
          <CardTitle>Satışı Yüksek olan ürünler</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {(() => {
                // Ürün bazlı satış verilerini hesapla
                const productSales = salesData.reduce((acc, sale) => {
                  const key = sale.urunKodu;
                  if (!acc[key]) {
                    acc[key] = {
                      urunKodu: sale.urunKodu,
                      toplamAdet: 0,
                      toplamTutar: 0,
                      markalar: new Set(),
                      personeller: {},
                      renkKodlari: new Set()
                    };
                  }
                  acc[key].toplamAdet += sale.satisAdeti;
                  acc[key].toplamTutar += sale.satisFiyati;
                  acc[key].markalar.add(sale.marka);
                  acc[key].renkKodlari.add(sale.renkKodu);
                  
                  if (!acc[key].personeller[sale.personelAdi]) {
                    acc[key].personeller[sale.personelAdi] = {
                      adet: 0,
                      tutar: 0
                    };
                  }
                  acc[key].personeller[sale.personelAdi].adet += sale.satisAdeti;
                  acc[key].personeller[sale.personelAdi].tutar += sale.satisFiyati;
                  
                  return acc;
                }, {} as Record<string, {
                  urunKodu: string;
                  toplamAdet: number;
                  toplamTutar: number;
                  markalar: Set<string>;
                  personeller: Record<string, { adet: number; tutar: number }>;
                  renkKodlari: Set<string>;
                }>);

                // En çok satan 5 ürünü bul
                const top5Products = Object.values(productSales)
                  .sort((a, b) => b.toplamAdet - a.toplamAdet)
                  .slice(0, 5);

                return top5Products.map((product, index) => {
                  const bestSeller = Object.entries(product.personeller)
                    .sort(([,a], [,b]) => b.adet - a.adet)[0];
                  
                  const percentage = (product.toplamAdet / statistics.totalQuantity) * 100;

                  return (
                    <div
                      key={product.urunKodu}
                      className="relative p-4 bg-secondary/5 rounded-lg hover:bg-secondary/10 transition-colors"
                    >
                      {/* Progress bar arka planı */}
                      <div 
                        className="absolute left-0 top-0 h-full bg-primary/5 rounded-lg transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                      
                      {/* İçerik */}
                      <div className="relative flex flex-col space-y-3">
                        {/* Üst Kısım - Ürün Bilgisi */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <span className="text-sm font-bold">{index + 1}</span>
                            </div>
                            <div>
                              <h3 className="font-medium">Ürün Kodu: {product.urunKodu}</h3>
                              <div className="text-sm text-muted-foreground">
                                {Array.from(product.markalar).join(', ')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Renk Kodları: {Array.from(product.renkKodlari).join(', ')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div className="text-xl font-bold text-green-600">
                                {new Intl.NumberFormat('tr-TR').format(product.toplamAdet)} adet
                              </div>
                              <div className="text-sm font-semibold text-primary">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Ciro: {new Intl.NumberFormat('tr-TR', { 
                                style: 'currency', 
                                currency: 'TRY',
                                maximumFractionDigits: 0 
                              }).format(product.toplamTutar)}
                            </div>
                          </div>
                        </div>

                        {/* Alt Kısım - En İyi Satıcı */}
                        <div className="flex items-center justify-between bg-primary/5 p-2 rounded-md">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/10">
                              En İyi Satıcı
                            </Badge>
                            <span className="font-medium">{bestSeller?.[0]}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              <span className="font-semibold text-green-600">
                                {new Intl.NumberFormat('tr-TR').format(bestSeller?.[1].adet || 0)}
                              </span>
                              <span className="text-muted-foreground ml-1">adet</span>
                            </div>
                            <div className="text-sm text-primary font-medium">
                              ({((bestSeller?.[1].adet || 0) / product.toplamAdet * 100).toFixed(1)}%)
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

      {/* Satış Detay Listesi */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-secondary/10 transition-colors"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Satış Detayları</CardTitle>
            <Button variant="ghost" size="icon">
              {isDetailsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {isDetailsOpen && (
          <CardContent>
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-4">
                {salesData.map((sale, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{sale.personelAdi}</h3>
                        <Badge variant="outline">{sale.marka}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Ürün Kodu:</span>
                          <span className="ml-2 font-medium">{sale.urunKodu}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Renk Kodu:</span>
                          <span className="ml-2 font-medium">{sale.renkKodu}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Satış Adedi</div>
                        <div className="text-xl font-bold text-blue-600">{sale.satisAdeti}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Satış Tutarı</div>
                        <div className="text-xl font-bold text-green-600">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
                            .format(sale.satisFiyati)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
} 