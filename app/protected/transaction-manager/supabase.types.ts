export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      periods: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
          bank_total: string;
          total_savings: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
          bank_total?: string | number;
          total_savings?: string | number;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
          bank_total?: string | number;
          total_savings?: string | number;
        };
        Relationships: [];
      };
      credit_cards: {
        Row: {
          id: string;
          period_id: string;
          name: string;
          credit_limit: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period_id: string;
          name: string;
          credit_limit: string | number;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          period_id?: string;
          name?: string;
          credit_limit?: string | number;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_cards_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          period_id: string;
          amount: string;
          method: Database["public"]["Enums"]["transaction_method"];
          category: Database["public"]["Enums"]["transaction_category"] | null;
          bank_category: Database["public"]["Enums"]["bank_transaction_category"] | null;
          savings_amount: string | null;
          card_id: string | null;
          card_name_snapshot: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period_id: string;
          amount: string | number;
          method: Database["public"]["Enums"]["transaction_method"];
          category?: Database["public"]["Enums"]["transaction_category"] | null;
          bank_category?: Database["public"]["Enums"]["bank_transaction_category"] | null;
          savings_amount?: string | number | null;
          card_id?: string | null;
          card_name_snapshot?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          period_id?: string;
          amount?: string | number;
          method?: Database["public"]["Enums"]["transaction_method"];
          category?: Database["public"]["Enums"]["transaction_category"] | null;
          bank_category?: Database["public"]["Enums"]["bank_transaction_category"] | null;
          savings_amount?: string | number | null;
          card_id?: string | null;
          card_name_snapshot?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "credit_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id"];
          },
        ];
      };
      period_visible_cards: {
        Row: {
          period_id: string;
          card_id: string;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          period_id: string;
          card_id: string;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          period_id?: string;
          card_id?: string;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "period_visible_cards_card_id_fkey";
            columns: ["card_id"];
            isOneToOne: false;
            referencedRelation: "credit_cards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "period_visible_cards_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      transaction_method: "debit" | "card" | "bank";
      transaction_category: "necessary" | "recreation";
      bank_transaction_category: "transfer" | "salary";
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<
  T extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][T]["Row"];

export type Inserts<
  T extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][T]["Insert"];

export type Updates<
  T extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][T]["Update"];

export type Enums<
  T extends keyof Database["public"]["Enums"]
> = Database["public"]["Enums"][T];
