export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations_v2: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      user_organizations_v2: {
        Row: {
          user_id: string
          organization_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          organization_id: string
          role?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          organization_id?: string
          role?: string
          created_at?: string
        }
      }
      personnel_sales_v2: {
        Row: {
          id: string
          organization_id: string | null
          personel_adi: string | null
          marka: string | null
          urun_kodu: string | null
          renk_kodu: string | null
          satis_adeti: number | null
          satis_fiyati: number | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          personel_adi?: string | null
          marka?: string | null
          urun_kodu?: string | null
          renk_kodu?: string | null
          satis_adeti?: number | null
          satis_fiyati?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          personel_adi?: string | null
          marka?: string | null
          urun_kodu?: string | null
          renk_kodu?: string | null
          satis_adeti?: number | null
          satis_fiyati?: number | null
          created_at?: string
        }
      }
      sales_v2: {
        Row: {
          id: string
          organization_id: string | null
          Marka: string | null
          "Ürün Grubu": string | null
          "Ürün Kodu": string | null
          "Renk Kodu": string | null
          Beden: string | null
          Envanter: number | null
          Sezon: string | null
          "Satış Miktarı": number | null
          "Satış (VD)": number | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          Marka?: string | null
          "Ürün Grubu"?: string | null
          "Ürün Kodu"?: string | null
          "Renk Kodu"?: string | null
          Beden?: string | null
          Envanter?: number | null
          Sezon?: string | null
          "Satış Miktarı"?: number | null
          "Satış (VD)"?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          Marka?: string | null
          "Ürün Grubu"?: string | null
          "Ürün Kodu"?: string | null
          "Renk Kodu"?: string | null
          Beden?: string | null
          Envanter?: number | null
          Sezon?: string | null
          "Satış Miktarı"?: number | null
          "Satış (VD)"?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 