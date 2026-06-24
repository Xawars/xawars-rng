import { createClient } from '@supabase/supabase-js';
import { RandomClient } from './RandomClient';

export const revalidate = 60;

export type RandomOperator = {
  id: string;
  name: string;
  codename: string;
  role: 'ATTACKER' | 'DEFENDER';
  country: string;
  health: number;
  speed: number;
  difficulty: number;
  ability_name: string;
  icon_url: string | null;
  portrait_url: string | null;
};

async function getOperators(): Promise<RandomOperator[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('operators')
    .select('id, name, codename, role, country, health, speed, difficulty, ability_name, icon_url, portrait_url');

  if (error) throw new Error(error.message);
  return (data ?? []) as RandomOperator[];
}

export default async function RandomPage() {
  const operators = await getOperators();
  return <RandomClient operators={operators} />;
}
