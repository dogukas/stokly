import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface StockItem {
  Marka: string
  "Ürün Grubu": string
  "Ürün Kodu": string
  "Renk Kodu": string
  Beden: string
  Envanter: string
  Barkod: string
  Sezon: string
}

interface StockState {
  version: number
  stockData: StockItem[]
  searchQuery: string
  filterField: keyof StockItem | ''
  filterValue: string
  setStockData: (data: StockItem[]) => void
  clearStockData: () => void
  setSearchQuery: (query: string) => void
  setFilter: (field: keyof StockItem | '', value: string) => void
  getFilteredData: () => StockItem[]
}

export const useStockStore = create<StockState>()(
  persist(
    (set, get) => ({
      version: 1, // Store versiyonu
      stockData: [],
      searchQuery: '',
      filterField: '',
      filterValue: '',
      setStockData: (data) => set({ stockData: data }),
      clearStockData: () => set({ stockData: [] }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilter: (field, value) => set({ filterField: field, filterValue: value }),
      getFilteredData: () => {
        const { stockData, searchQuery, filterField, filterValue } = get()
        
        return stockData.filter((item) => {
          // Genel arama
          if (searchQuery) {
            const searchLower = searchQuery.toLowerCase()
            return Object.values(item).some(
              (value) => value.toString().toLowerCase().includes(searchLower)
            )
          }
          
          // Spesifik alan filtresi
          if (filterField && filterValue) {
            const itemValue = item[filterField].toString().toLowerCase()
            return itemValue.includes(filterValue.toLowerCase())
          }
          
          return true
        })
      },
    }),
    {
      name: 'stock-storage',
      storage: createJSONStorage(() => localStorage),
      version: 1, // Persist middleware versiyonu
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Eğer eski versiyon varsa, yeni yapıya dönüştür
          return {
            version: 1,
            stockData: persistedState.stockData || [],
            searchQuery: '',
            filterField: '',
            filterValue: '',
          }
        }
        return persistedState as StockState
      },
    }
  )
) 