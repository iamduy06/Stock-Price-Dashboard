import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const stocks = [
  { symbol: 'FPT', company_name: 'FPT Corporation', reference_price: 95000 },
  { symbol: 'VNM', company_name: 'Vinamilk', reference_price: 68000 },
  { symbol: 'VIC', company_name: 'Vingroup', reference_price: 45000 },
  { symbol: 'VCB', company_name: 'Vietcombank', reference_price: 92000 },
  { symbol: 'HPG', company_name: 'Hoa Phat Group', reference_price: 30000 },
  { symbol: 'MWG', company_name: 'Mobile World', reference_price: 55000 },
  { symbol: 'TCB', company_name: 'Techcombank', reference_price: 48000 },
  { symbol: 'VHM', company_name: 'Vinhomes', reference_price: 42000 },
  { symbol: 'GAS', company_name: 'PV GAS', reference_price: 78000 },
  { symbol: 'MSN', company_name: 'Masan Group', reference_price: 74000 },
  { symbol: 'ACB', company_name: 'Asia Commercial Bank', reference_price: 28000 },
  { symbol: 'MBB', company_name: 'MB Bank', reference_price: 24000 },
  { symbol: 'STB', company_name: 'Sacombank', reference_price: 32000 },
  { symbol: 'VPB', company_name: 'VPBank', reference_price: 19000 },
  { symbol: 'TPB', company_name: 'TPBank', reference_price: 18000 },
  { symbol: 'CTG', company_name: 'VietinBank', reference_price: 35000 },
  { symbol: 'SSI', company_name: 'SSI Securities', reference_price: 36000 },
  { symbol: 'VND', company_name: 'VNDIRECT Securities', reference_price: 22000 },
  { symbol: 'POW', company_name: 'PetroVietnam Power', reference_price: 12000 },
  { symbol: 'PLX', company_name: 'Petrolimex', reference_price: 38000 }
];

async function seed() {
  console.log(' Seeding stocks...');

  for (const stock of stocks) {
    const ceiling = stock.reference_price * 1.07;
    const floor = stock.reference_price * 0.93;

    const { error } = await supabase.from('stocks').upsert({
      symbol: stock.symbol,
      company_name: stock.company_name,
      reference_price: stock.reference_price,
      ceiling_price: Math.round(ceiling / 10) * 10,
      floor_price: Math.round(floor / 10) * 10
    });

    if (error) {
      console.error(`Error seeding ${stock.symbol}:`, error.message);
    } else {
      console.log(` Seeded ${stock.symbol}`);
    }
  }

  console.log(' Seeding complete!');
}

seed();
