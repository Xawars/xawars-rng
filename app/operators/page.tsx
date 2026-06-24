import { createClient } from '@supabase/supabase-js';
import { OperatorsClient } from './OperatorsClient';

export const revalidate = 60; // ponytail: ISR — revalidate every 60s, not every page view

export type OperatorGridItem = {
  id: string;
  name: string;
  codename: string;
  role: 'ATTACKER' | 'DEFENDER';
  organization: string;
  country: string;
  health: number;
  speed: number;
  difficulty: number;
  ability_name: string;
  playstyles: string[];
  icon_url: string | null;
  portrait_url: string | null;
};

async function getOperators(): Promise<OperatorGridItem[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from('operators')
    .select('id, name, codename, role, organization, country, health, speed, difficulty, ability_name, playstyles, icon_url, portrait_url')
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as OperatorGridItem[];
}

export default async function OperatorsPage() {
  const operators = await getOperators();
  return <OperatorsClient operators={operators} />;
}
