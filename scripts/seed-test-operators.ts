import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

type OperatorRow = {
  name: string;
  codename: string;
  role: "ATTACKER" | "DEFENDER";
  organization: string;
  country: string;
  release_season: string;
  release_year: number;
  health: number;
  speed: number;
  difficulty: number;
  ability_name: string;
  ability_description: string;
  playstyles: string[];
  strengths: string[];
  weaknesses: string[];
  icon_url?: string | null;
  portrait_url?: string | null;
};

async function main() {
  const raw = await fs.readFile("./operators.json", "utf8");
  const operators: OperatorRow[] = JSON.parse(raw);

  // ponytail: upsert by name so the script is idempotent on re-runs
  const { error } = await supabase
    .from("operators")
    .upsert(operators, { onConflict: "name" });

  if (error) {
    console.error("Insert error:", error);
    process.exit(1);
  }

  console.log("Inserted operators:", operators.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
