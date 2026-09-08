export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acessos: {
        Row: {
          created_at: string
          decidido_em: string | null
          decidido_por: string | null
          email: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          email?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decidido_em?: string | null
          decidido_por?: string | null
          email?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      atividades: {
        Row: {
          acao: string
          area: string
          created_at: string
          descricao: string | null
          id: string
          user_id: string | null
          usuario_email: string | null
        }
        Insert: {
          acao: string
          area: string
          created_at?: string
          descricao?: string | null
          id?: string
          user_id?: string | null
          usuario_email?: string | null
        }
        Update: {
          acao?: string
          area?: string
          created_at?: string
          descricao?: string | null
          id?: string
          user_id?: string | null
          usuario_email?: string | null
        }
        Relationships: []
      }
      custos: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          km: number | null
          pendente: boolean
          tipo: string
          valor: number
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          km?: number | null
          pendente?: boolean
          tipo: string
          valor: number
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          km?: number | null
          pendente?: boolean
          tipo?: string
          valor?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          tipo: string
          updated_at: string
          veiculo_id: string
          vencimento: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          tipo: string
          updated_at?: string
          veiculo_id: string
          vencimento: string
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          tipo?: string
          updated_at?: string
          veiculo_id?: string
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      lembretes: {
        Row: {
          concluido: boolean
          created_at: string
          data: string
          id: string
          observacao: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          data: string
          id?: string
          observacao?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      manutencoes: {
        Row: {
          created_at: string
          custo_id: string | null
          data: string
          id: string
          observacoes: string | null
          oficina: string | null
          peca_servico: string
          updated_at: string
          valor: number | null
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          custo_id?: string | null
          data?: string
          id?: string
          observacoes?: string | null
          oficina?: string | null
          peca_servico: string
          updated_at?: string
          valor?: number | null
          veiculo_id: string
        }
        Update: {
          created_at?: string
          custo_id?: string | null
          data?: string
          id?: string
          observacoes?: string | null
          oficina?: string | null
          peca_servico?: string
          updated_at?: string
          valor?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_custo_id_fkey"
            columns: ["custo_id"]
            isOneToOne: false
            referencedRelation: "custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          cnh_path: string | null
          contato: string | null
          created_at: string
          departamento: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cnh_path?: string | null
          contato?: string | null
          created_at?: string
          departamento?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cnh_path?: string | null
          contato?: string | null
          created_at?: string
          departamento?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculo_etiquetas: {
        Row: {
          created_at: string
          etiqueta_id: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          etiqueta_id: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          etiqueta_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculo_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculo_etiquetas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          codigo: string | null
          cor: string | null
          created_at: string
          departamento: string | null
          duplicado: boolean
          fotos: string[]
          id: string
          km_atual: number
          marca_modelo: string | null
          max_anexos: number
          motorista: string | null
          motorista_id: string | null
          nome: string | null
          observacao: string | null
          placa: string
          status: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          cor?: string | null
          created_at?: string
          departamento?: string | null
          duplicado?: boolean
          fotos?: string[]
          id?: string
          km_atual?: number
          marca_modelo?: string | null
          max_anexos?: number
          motorista?: string | null
          motorista_id?: string | null
          nome?: string | null
          observacao?: string | null
          placa: string
          status?: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          cor?: string | null
          created_at?: string
          departamento?: string | null
          duplicado?: boolean
          fotos?: string[]
          id?: string
          km_atual?: number
          marca_modelo?: string | null
          max_anexos?: number
          motorista?: string | null
          motorista_id?: string | null
          nome?: string | null
          observacao?: string | null
          placa?: string
          status?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "usuario"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "usuario"],
    },
  },
} as const
