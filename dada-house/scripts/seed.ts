import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function main() {
  console.log("🌱 Seeding DADA HOUSE database...\n");

  const check = await pool.query(`SELECT COUNT(*) AS cnt FROM "User" WHERE role = 'TECHNICIAN'`);
  if (parseInt(check.rows[0].cnt) > 0) {
    console.log("⚠️  Technician users already exist. Delete them first to re-seed.");
    return;
  }

  const pw = await bcrypt.hash("Dada2026!", 10);

  // ─── 1. TECHNICIAN USERS ───────────────────────────────────────────────────
  const t1 = randomUUID(), t2 = randomUUID(), t3 = randomUUID(), t4 = randomUUID();

  await pool.query(
    `INSERT INTO "User" (id,name,email,phone,password,role,"createdAt","updatedAt") VALUES
      ($1,'Carlos Mendez',   'carlos@dada-house.com',  '713-555-1001',$5,'TECHNICIAN',$6,$6),
      ($2,'David Johnson',   'david@dada-house.com',   '713-555-1002',$5,'TECHNICIAN',$6,$6),
      ($3,'Miguel Santos',   'miguel@dada-house.com',  '713-555-1003',$5,'TECHNICIAN',$6,$6),
      ($4,'Robert Williams', 'robert@dada-house.com',  '713-555-1004',$5,'TECHNICIAN',$6,$6)`,
    [t1, t2, t3, t4, pw, daysAgo(180)]
  );
  console.log("✓ Technician users (4)");

  // ─── 2. TECHNICIAN PROFILES ────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO "TechnicianProfile" (id,"userId",vehicle,specialties,"isActive","createdAt","updatedAt") VALUES
      ($1,$5,'White Ford F-150',    ARRAY['Plumbing','Drain Cleaning','Water Heaters'],      true,NOW(),NOW()),
      ($2,$6,'Blue Chevy Silverado',ARRAY['Air Conditioning','HVAC','Refrigeration'],        true,NOW(),NOW()),
      ($3,$7,'White Ram 1500',      ARRAY['Heating','Furnaces','Heat Pumps'],                true,NOW(),NOW()),
      ($4,$8,'Black Ford Transit',  ARRAY['Remodeling','Tile','Carpentry','Drywall'],        true,NOW(),NOW())`,
    [randomUUID(), randomUUID(), randomUUID(), randomUUID(), t1, t2, t3, t4]
  );
  console.log("✓ Technician profiles (4)");

  // ─── 3. DISPATCHER ─────────────────────────────────────────────────────────
  await pool.query(
    `INSERT INTO "User" (id,name,email,phone,password,role,"createdAt","updatedAt") VALUES
      ($1,'Sarah Thompson','sarah@dada-house.com','713-555-2001',$2,'DISPATCHER',$3,$3)`,
    [randomUUID(), pw, daysAgo(90)]
  );
  console.log("✓ Dispatcher user (1)");

  // ─── 4. CLIENT USERS ───────────────────────────────────────────────────────
  const c1 = randomUUID(), c2 = randomUUID(), c3 = randomUUID();
  await pool.query(
    `INSERT INTO "User" (id,name,email,phone,password,role,"createdAt","updatedAt") VALUES
      ($1,'Jennifer Martinez','jennifer.martinez@email.com','832-555-3001',$4,'CLIENT',$5,$5),
      ($2,'Michael Brown',    'michael.brown@email.com',   '832-555-3002',$4,'CLIENT',$6,$6),
      ($3,'Patricia Davis',   'patricia.davis@email.com',  '832-555-3003',$4,'CLIENT',$7,$7)`,
    [c1, c2, c3, pw, daysAgo(170), daysAgo(140), daysAgo(110)]
  );
  console.log("✓ Client users (3)");

  // ─── 5. APPOINTMENTS (25 across 6 months) ─────────────────────────────────
  type ApptRow = {
    uid: string; svc: string; sub: string; name: string; phone: string; email: string;
    addr: string; zip: string; desc: string; tech: string | null;
    date: string; status: string; num: string;
  };

  const aIds = Array.from({ length: 25 }, () => randomUUID());

  const appts: ApptRow[] = [
    // December 2025 — 3 COMPLETED
    { num:"DH-2025-10001", uid:c1, svc:"Air Conditioning", sub:"Annual Maintenance",    name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"Annual AC maintenance and tune-up",                    date:"2025-12-05", status:"COMPLETED",    tech:t2 },
    { num:"DH-2025-10002", uid:c2, svc:"Plumbing",          sub:"Leak Repair",          name:"Michael Brown",     phone:"832-555-3002", email:"michael.brown@email.com",    addr:"7890 Memorial Dr",       zip:"77024", desc:"Kitchen sink leak under cabinet",                      date:"2025-12-12", status:"COMPLETED",    tech:t1 },
    { num:"DH-2025-10003", uid:c3, svc:"Heating",            sub:"Inspection",           name:"Patricia Davis",    phone:"832-555-3003", email:"patricia.davis@email.com",   addr:"2345 S Braeswood Blvd",  zip:"77030", desc:"Heating system inspection before winter season",        date:"2025-12-20", status:"COMPLETED",    tech:t3 },
    // January 2026 — 3 COMPLETED + 1 CANCELLED
    { num:"DH-2026-10001", uid:c1, svc:"Plumbing",          sub:"Water Heater Replace", name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"40-gallon water heater replacement",                   date:"2026-01-08", status:"COMPLETED",    tech:t1 },
    { num:"DH-2026-10002", uid:c2, svc:"Air Conditioning",  sub:"System Replacement",   name:"Michael Brown",     phone:"832-555-3002", email:"michael.brown@email.com",    addr:"7890 Memorial Dr",       zip:"77024", desc:"Complete central AC unit replacement 3-ton",           date:"2026-01-15", status:"COMPLETED",    tech:t2 },
    { num:"DH-2026-10003", uid:c3, svc:"Plumbing",          sub:"Drain Cleaning",       name:"Patricia Davis",    phone:"832-555-3003", email:"patricia.davis@email.com",   addr:"2345 S Braeswood Blvd",  zip:"77030", desc:"Main drain blockage and hydro-jetting",                date:"2026-01-22", status:"COMPLETED",    tech:t1 },
    { num:"DH-2026-10004", uid:c1, svc:"Remodeling",        sub:"Bathroom Remodel",     name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"Master bathroom full remodel estimate",                date:"2026-01-28", status:"CANCELLED",    tech:null },
    // February 2026 — 3 COMPLETED + 1 CONFIRMED
    { num:"DH-2026-10005", uid:c2, svc:"Plumbing",          sub:"Pipe Repair",          name:"Michael Brown",     phone:"832-555-3002", email:"michael.brown@email.com",    addr:"7890 Memorial Dr",       zip:"77024", desc:"Burst pipe repair in utility room",                    date:"2026-02-05", status:"COMPLETED",    tech:t1 },
    { num:"DH-2026-10006", uid:c3, svc:"Air Conditioning",  sub:"Refrigerant Recharge", name:"Patricia Davis",    phone:"832-555-3003", email:"patricia.davis@email.com",   addr:"2345 S Braeswood Blvd",  zip:"77030", desc:"AC not cooling — refrigerant check and recharge",      date:"2026-02-11", status:"COMPLETED",    tech:t2 },
    { num:"DH-2026-10007", uid:c1, svc:"Heating",            sub:"Furnace Repair",       name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"Furnace making loud noise, igniter issue",              date:"2026-02-18", status:"COMPLETED",    tech:t3 },
    { num:"DH-2026-10008", uid:c2, svc:"Remodeling",        sub:"Kitchen Upgrade",      name:"Michael Brown",     phone:"832-555-3002", email:"michael.brown@email.com",    addr:"7890 Memorial Dr",       zip:"77024", desc:"Kitchen backsplash tile and cabinet refinishing",      date:"2026-02-25", status:"CONFIRMED",    tech:t4 },
    // March 2026 — 4 COMPLETED + 1 CONFIRMED
    { num:"DH-2026-10009", uid:c3, svc:"Air Conditioning",  sub:"New Installation",     name:"Patricia Davis",    phone:"832-555-3003", email:"patricia.davis@email.com",   addr:"2345 S Braeswood Blvd",  zip:"77030", desc:"New 3.5-ton AC system with ductwork installation",     date:"2026-03-04", status:"COMPLETED",    tech:t2 },
    { num:"DH-2026-10010", uid:c1, svc:"Plumbing",          sub:"Fixture Install",      name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"New bathroom fixtures: faucets, shower head, toilet",  date:"2026-03-11", status:"COMPLETED",    tech:t1 },
    { num:"DH-2026-10011", uid:c2, svc:"Heating",            sub:"Heat Pump Install",    name:"Michael Brown",     phone:"832-555-3002", email:"michael.brown@email.com",    addr:"7890 Memorial Dr",       zip:"77024", desc:"3-ton heat pump installation and thermostat setup",    date:"2026-03-18", status:"COMPLETED",    tech:t3 },
    { num:"DH-2026-10012", uid:c3, svc:"Plumbing",          sub:"Tankless Water Heater",name:"Patricia Davis",    phone:"832-555-3003", email:"patricia.davis@email.com",   addr:"2345 S Braeswood Blvd",  zip:"77030", desc:"Navien tankless water heater installation",            date:"2026-03-25", status:"COMPLETED",    tech:t1 },
    { num:"DH-2026-10013", uid:c1, svc:"Remodeling",        sub:"Bathroom Renovation",  name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"Guest bathroom renovation — tile, vanity, fixtures",   date:"2026-03-30", status:"CONFIRMED",    tech:t4 },
    // April 2026 — 2 COMPLETED + 1 IN_PROGRESS + 1 CONFIRMED
    { num:"DH-2026-10014", uid:c2, svc:"Air Conditioning",  sub:"Spring Tune-Up",       name:"Michael Brown",     phone:"832-555-3002", email:"michael.brown@email.com",    addr:"7890 Memorial Dr",       zip:"77024", desc:"Spring AC tune-up, coil cleaning, filter replace",     date:"2026-04-07", status:"COMPLETED",    tech:t2 },
    { num:"DH-2026-10015", uid:c3, svc:"Plumbing",          sub:"Slab Leak Repair",     name:"Patricia Davis",    phone:"832-555-3003", email:"patricia.davis@email.com",   addr:"2345 S Braeswood Blvd",  zip:"77030", desc:"Slab leak detection and epoxy pipe repair",            date:"2026-04-15", status:"COMPLETED",    tech:t1 },
    { num:"DH-2026-10016", uid:c1, svc:"Heating",            sub:"Annual Service",       name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"Heating system annual service and calibration",        date:"2026-04-22", status:"IN_PROGRESS", tech:t3 },
    { num:"DH-2026-10017", uid:c2, svc:"Remodeling",        sub:"Hardwood Flooring",    name:"Michael Brown",     phone:"832-555-3002", email:"michael.brown@email.com",    addr:"7890 Memorial Dr",       zip:"77024", desc:"Hardwood floor installation — living and dining room", date:"2026-04-28", status:"CONFIRMED",    tech:t4 },
    // May 2026 — 2 PENDING + 2 CONFIRMED + 1 IN_PROGRESS
    { num:"DH-2026-10018", uid:c3, svc:"Air Conditioning",  sub:"Emergency Repair",     name:"Patricia Davis",    phone:"832-555-3003", email:"patricia.davis@email.com",   addr:"2345 S Braeswood Blvd",  zip:"77030", desc:"AC stopped working completely, emergency service",      date:"2026-05-03", status:"PENDING",      tech:null },
    { num:"DH-2026-10019", uid:c1, svc:"Plumbing",          sub:"Faucet Repair",        name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"Kitchen and master bath faucet leaks",                 date:"2026-05-10", status:"CONFIRMED",    tech:t1 },
    { num:"DH-2026-10020", uid:c2, svc:"Heating",            sub:"Thermostat Install",   name:"Michael Brown",     phone:"832-555-3002", email:"michael.brown@email.com",    addr:"7890 Memorial Dr",       zip:"77024", desc:"Ecobee smart thermostat installation and setup",       date:"2026-05-15", status:"IN_PROGRESS", tech:t3 },
    { num:"DH-2026-10021", uid:c3, svc:"Plumbing",          sub:"Water Softener",       name:"Patricia Davis",    phone:"832-555-3003", email:"patricia.davis@email.com",   addr:"2345 S Braeswood Blvd",  zip:"77030", desc:"Whole-home water softener and filtration system",       date:"2026-05-20", status:"PENDING",      tech:null },
    { num:"DH-2026-10022", uid:c1, svc:"Remodeling",        sub:"Kitchen Remodel",      name:"Jennifer Martinez", phone:"832-555-3001", email:"jennifer.martinez@email.com", addr:"4521 Westheimer Rd",    zip:"77027", desc:"Full kitchen remodel — cabinets, counters, backsplash", date:"2026-05-23", status:"CONFIRMED",    tech:t4 },
  ];

  for (let i = 0; i < appts.length; i++) {
    const a = appts[i];
    await pool.query(
      `INSERT INTO "Appointment"
         (id,"appointmentNumber","userId",service,subservice,name,phone,email,address,city,"zipCode",description,"technicianId","preferredDate",status,"createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Houston',$10,$11,$12,$13::timestamptz,$14,$15::timestamptz,$15::timestamptz)`,
      [
        aIds[i], a.num, a.uid, a.svc, a.sub, a.name, a.phone, a.email, a.addr,
        a.zip, a.desc, a.tech,
        a.date + "T10:00:00Z",
        a.status,
        a.date + "T08:00:00Z",
      ]
    );
  }
  console.log("✓ Appointments (25)");

  // ─── 6. INVOICES (PAID) for completed appointments ─────────────────────────
  const invoices: { idx: number; amount: number; paidDays: number }[] = [
    { idx: 0,  amount:   285, paidDays: 165 },  // Dec AC maintenance
    { idx: 1,  amount:   450, paidDays: 158 },  // Dec Plumbing
    { idx: 2,  amount:   320, paidDays: 150 },  // Dec Heating
    { idx: 3,  amount:  1850, paidDays: 136 },  // Jan Water heater
    { idx: 4,  amount:  2400, paidDays: 129 },  // Jan AC replacement
    { idx: 5,  amount:   375, paidDays: 122 },  // Jan Drain cleaning
    { idx: 7,  amount:   290, paidDays: 108 },  // Feb Pipe repair
    { idx: 8,  amount:   950, paidDays: 102 },  // Feb AC recharge
    { idx: 9,  amount:   680, paidDays:  95 },  // Feb Furnace repair
    { idx: 11, amount:  2800, paidDays:  81 },  // Mar AC installation
    { idx: 12, amount:   425, paidDays:  74 },  // Mar Fixture install
    { idx: 13, amount:  3200, paidDays:  67 },  // Mar Heat pump
    { idx: 14, amount:  2100, paidDays:  60 },  // Mar Tankless heater
    { idx: 16, amount:   285, paidDays:  47 },  // Apr AC tune-up
    { idx: 17, amount:  1800, paidDays:  39 },  // Apr Slab leak
  ];

  for (const inv of invoices) {
    const paidAt = daysAgo(inv.paidDays);
    await pool.query(
      `INSERT INTO "Invoice" (id,"appointmentId",amount,status,"paidAt","createdAt","updatedAt")
       VALUES ($1,$2,$3,'PAID',$4,$4,$4)`,
      [randomUUID(), aIds[inv.idx], inv.amount, paidAt]
    );
  }
  const totalRev = invoices.reduce((s, i) => s + i.amount, 0);
  console.log(`✓ Invoices PAID (${invoices.length}) — $${totalRev.toLocaleString()} total revenue`);

  // ─── 7. APPROVED REVIEWS ───────────────────────────────────────────────────
  const reviews = [
    { name:"David Rivera",    email:"d.rivera@email.com",   service:"Air Conditioning", rating:5, daysAgo:155,
      content:"Carlos and his team were phenomenal! Our AC went out during the hottest week of summer and DADA HOUSE had a technician at our door within 2 hours. The repair was done professionally and the price was very fair. Highly recommend!" },
    { name:"Lisa Chen",       email:"l.chen@email.com",      service:"Plumbing",          rating:5, daysAgo:140,
      content:"The plumbing team fixed our major leak in under 2 hours. Professional, clean, and they explained every step. Won't use anyone else for our plumbing needs. Best company in Houston!" },
    { name:"James Thompson",  email:"j.thompson@email.com",  service:"Heating",            rating:4, daysAgo:128,
      content:"Great service on our heating system inspection. Miguel was knowledgeable and thorough. Only reason for 4 stars is the scheduling took a couple days, but the actual service was top-notch." },
    { name:"Maria Rodriguez", email:"m.rodriguez@email.com", service:"Remodeling",         rating:5, daysAgo:115,
      content:"Absolutely stunning bathroom remodel! Robert and his crew transformed our outdated bathroom into a spa-like retreat. The tile work is flawless, they finished on time, and cleaned up every day. 10/10!" },
    { name:"Robert Kim",      email:"r.kim@email.com",        service:"Air Conditioning",  rating:5, daysAgo:100,
      content:"David from DADA HOUSE installed our new central AC system and did an incredible job. He walked us through the entire system, set up the smart thermostat, and even registered the warranty for us. This is what 5-star service looks like." },
    { name:"Sarah Mitchell",  email:"s.mitchell@email.com",  service:"Plumbing",           rating:4, daysAgo:82,
      content:"Fast response to our emergency water heater issue. Carlos arrived within 90 minutes at 9pm, diagnosed the problem, and had it fixed before midnight. True 24/7 service. Excellent work!" },
    { name:"Anthony Williams",email:"a.williams@email.com",  service:"Heating",            rating:5, daysAgo:64,
      content:"Miguel installed our new heat pump perfectly. On time, professional, took the time to explain how to get the most efficiency from the system. Our energy bill dropped by 30% the first month. Outstanding work!" },
    { name:"Emily Johnson",   email:"e.johnson@email.com",   service:"Air Conditioning",  rating:5, daysAgo:45,
      content:"Called DADA HOUSE at 11pm for emergency AC repair in 95° heat with a newborn at home. David was there within an hour, fixed the issue, and refused to charge an after-hours premium. These people genuinely care about their customers. Forever customers!" },
  ];

  for (const r of reviews) {
    await pool.query(
      `INSERT INTO "Review" (id,name,email,service,rating,content,approved,"createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
      [randomUUID(), r.name, r.email, r.service, r.rating, r.content, daysAgo(r.daysAgo)]
    );
  }
  console.log(`✓ Reviews approved (${reviews.length})`);

  // ─── 8. STORE PRODUCTS ─────────────────────────────────────────────────────
  const products = [
    { name:"16x25x1 MERV-11 Air Filter (3-Pack)",    slug:"air-filter-16x25-3pack",     desc:"MERV-11 pleated filters — reduces dust, pollen, and allergens. Fits most standard 1\" slots.",                                                price: 24.99, compare: 34.99, cat:"Filters",     featured:false },
    { name:"Ecobee SmartThermostat Premium",          slug:"ecobee-smartthermostat",     desc:"Wi-Fi smart thermostat with voice control, occupancy sensor, and energy reports. Works with Alexa & Google Home.",                             price:249.99, compare:279.99, cat:"Thermostats", featured:true  },
    { name:"Pipe Thread Sealant Tape (10-Pack)",      slug:"ptfe-tape-10pack",           desc:"Professional-grade PTFE thread seal tape for all pipe fittings. 1/2\" wide, 520\" roll.",                                                     price:  9.99, compare:  null, cat:"Plumbing",    featured:false },
    { name:"Brass Ball Valve 3/4\" Full Port",        slug:"brass-ball-valve-3-4",       desc:"Full-port brass ball valve, 600 PSI WOG. Quarter-turn operation. Blow-out proof stem.",                                                        price: 18.99, compare:  null, cat:"Plumbing",    featured:false },
    { name:"20x25x4 Furnace Filter (2-Pack)",         slug:"furnace-filter-20x25x4",     desc:"MERV-13 deep-pleated furnace filter. Captures fine particles including smoke and bacteria. Lasts up to 12 months.",                            price: 49.99, compare: 64.99, cat:"Filters",     featured:false },
    { name:"Magnesium Anode Rod for Water Heater",    slug:"anode-rod-magnesium",        desc:"Sacrificial magnesium anode rod protects your water heater tank from corrosion. Universal fit for most 40–75 gallon tanks.",                   price: 29.99, compare:  null, cat:"Plumbing",    featured:false },
    { name:"HVAC No-Rinse Coil Cleaner Spray",        slug:"hvac-coil-cleaner-spray",    desc:"Professional-strength foaming coil cleaner for evaporator and condenser coils. Lifts dirt without rinsing.",                                   price: 16.99, compare:  null, cat:"HVAC",        featured:false },
    { name:"Digital Manifold Gauge Set (HVAC)",       slug:"digital-manifold-gauge-set", desc:"4-valve digital manifold for R-22, R-410A, R-134A. Includes hoses and carrying case. Pro-grade accuracy.",                                     price:189.99, compare:239.99, cat:"HVAC",        featured:false },
    { name:"Carbon Monoxide Detector (10-Year)",      slug:"co-detector-10year",         desc:"10-year sealed battery CO detector with digital display. UL listed. Alerts at 70 PPM. Plug-in with battery backup.",                           price: 39.99, compare:  null, cat:"Safety",      featured:true  },
    { name:"Drain Snake Cable Auger 25ft",            slug:"drain-snake-25ft",           desc:"Heavy-duty 25-foot snake for clearing clogs in sinks, tubs, and toilets. 5/16\" cable with T-bar handle.",                                     price: 34.99, compare: 44.99, cat:"Plumbing",    featured:false },
    { name:"Ductless Mini-Split Cleaning Kit",        slug:"mini-split-cleaning-kit",    desc:"Complete kit for ductless systems: coil cleaner, protective bag cover, and gloves. Keeps your unit running at peak efficiency.",                price: 28.99, compare:  null, cat:"HVAC",        featured:false },
    { name:"PEX Pipe Expansion Tool Kit 1/2\"–1\"",  slug:"pex-expansion-tool-kit",     desc:"Professional PEX-A expansion tool with 1/2\", 3/4\", and 1\" heads. Compatible with all PEX-A tubing brands.",                               price:159.99, compare:199.99, cat:"Plumbing",    featured:false },
  ];

  for (let i = 0; i < products.length; i++) {
    const pr = products[i];
    await pool.query(
      `INSERT INTO "Product" (id,name,slug,description,price,"comparePrice",category,"inStock",featured,"sortOrder","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,NOW(),NOW())`,
      [randomUUID(), pr.name, pr.slug, pr.desc, pr.price, pr.compare ?? null, pr.cat, pr.featured, i + 1]
    );
  }
  console.log(`✓ Products (${products.length})`);

  // ─── 9. GALLERY PROJECTS ───────────────────────────────────────────────────
  const gallery = [
    { title:"Complete Master Bathroom Transformation", category:"Remodeling",        location:"River Oaks, Houston",    date:"March 2026",    tags:["Bathroom","Tile","Vanity","Shower","Heated Floors"],
      desc:"Full gut-to-studs master bathroom renovation. Custom tile shower with frameless glass door, double vanity with quartz counters, heated floors, and designer lighting. 3-week project, completed on schedule." },
    { title:"3.5-Ton Central AC System Replacement",   category:"Air Conditioning",  location:"Memorial, Houston",      date:"March 2026",    tags:["AC","HVAC","Ductwork","Energy Efficient"],
      desc:"Replaced aging 15-year-old AC system with high-efficiency Carrier unit. New ductwork, smart thermostat, and air purification. Customer reported 40% reduction in energy bills." },
    { title:"Whole-Home Plumbing Re-pipe",             category:"Plumbing",          location:"Katy, TX",               date:"February 2026", tags:["Plumbing","Re-pipe","PEX","Water Heater"],
      desc:"Complete re-pipe of a 1970s home with corroded galvanized pipes. All supply lines replaced with PEX tubing, new shutoffs throughout, new water heater. Pressure dramatically improved." },
    { title:"Heat Pump Installation — Energy Upgrade", category:"Heating",           location:"Sugar Land, TX",         date:"January 2026",  tags:["Heating","Heat Pump","Energy Efficient","Smart Home"],
      desc:"Replaced old gas furnace with high-efficiency heat pump. Smart thermostat with zone control. Customer qualifies for $2,000 federal tax credit. Estimated 35% annual savings." },
    { title:"Kitchen & Bathroom Fixture Overhaul",     category:"Plumbing",          location:"The Heights, Houston",   date:"December 2025", tags:["Plumbing","Fixtures","Kitchen","Bathroom"],
      desc:"Updated all kitchen and bathroom fixtures in a 1990s home. Touchless kitchen faucet, rainfall shower heads, water-saving toilets, new garbage disposal. Modern and efficient." },
    { title:"Commercial HVAC Multi-Zone Installation", category:"Air Conditioning",  location:"Downtown Houston",        date:"November 2025", tags:["Commercial","HVAC","Multi-Zone","Air Quality"],
      desc:"Designed and installed a 5-zone commercial HVAC system for a 4,000 sqft office suite. Includes HEPA filtration and remote monitoring. Completed in 4 days with zero business disruption." },
  ];

  for (let i = 0; i < gallery.length; i++) {
    const g = gallery[i];
    const tagList = g.tags.map((_, j) => `$${j + 8}`).join(",");
    await pool.query(
      `INSERT INTO "GalleryProject" (id,title,category,location,date,description,tags,published,"sortOrder","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,ARRAY[${tagList}],true,$7,NOW(),NOW())`,
      [randomUUID(), g.title, g.category, g.location, g.date, g.desc, i + 1, ...g.tags]
    );
  }
  console.log(`✓ Gallery projects (${gallery.length})`);

  // ─── 10. PUBLIC TECHNICIAN TEAM (Technician model) ─────────────────────────
  const teamMembers = [
    { name:"Carlos Mendez",   role:"Senior Plumber",          specialties:["Plumbing","Water Heaters","Drain Cleaning","Slab Leak Repair"],      phone:"713-555-1001", email:"carlos@dada-house.com", bio:"Carlos brings 12 years of Houston plumbing expertise. Specializes in complex slab leak detection and tankless water heater installations." },
    { name:"David Johnson",   role:"HVAC Lead Technician",    specialties:["Air Conditioning","HVAC Design","Refrigeration","Ductwork"],          phone:"713-555-1002", email:"david@dada-house.com",  bio:"David is our AC expert with a decade of experience in Houston's demanding climate. Certified in all major HVAC brands and systems." },
    { name:"Miguel Santos",   role:"Heating Specialist",      specialties:["Heating Systems","Furnaces","Heat Pumps","Energy Audits"],            phone:"713-555-1003", email:"miguel@dada-house.com", bio:"Miguel specializes in heating systems for the Gulf Coast region. Expert in high-efficiency heat pump installations and energy savings." },
    { name:"Robert Williams", role:"Remodeling Project Lead", specialties:["Bathroom Remodeling","Kitchen Renovation","Tile Work","Flooring"],   phone:"713-555-1004", email:"robert@dada-house.com", bio:"Robert leads our remodeling division with 15 years of residential renovation experience. Known for stunning tile and custom finishes." },
  ];

  for (let i = 0; i < teamMembers.length; i++) {
    const tm = teamMembers[i];
    const specList = tm.specialties.map((_, j) => `$${j + 8}`).join(",");
    await pool.query(
      `INSERT INTO "Technician" (id,name,role,specialties,phone,email,bio,available,"sortOrder","createdAt","updatedAt")
       VALUES ($1,$2,$3,ARRAY[${specList}],$4,$5,$6,true,$7,NOW(),NOW())`,
      [randomUUID(), tm.name, tm.role, tm.phone, tm.email, tm.bio, i + 1, ...tm.specialties]
    );
  }
  console.log("✓ Public technician team (4)");

  // ─── 11. SERVICE PLANS ─────────────────────────────────────────────────────
  const plans = [
    { name:"Essential", desc:"2 seasonal tune-ups per year plus priority scheduling", price:49,  features:["2 seasonal HVAC tune-ups/year","Priority scheduling (48-hr response)","10% discount on all repairs","Annual plumbing inspection","4 replacement filters/year"] },
    { name:"Pro",       desc:"4 visits per year, emergency service, expanded coverage",price:99,  features:["4 service visits/year","Emergency service (same-day response)","15% discount on all repairs","Unlimited filter replacements","Annual whole-home inspection","Water heater flush & inspection"] },
    { name:"Premium",   desc:"Unlimited visits, 24/7 emergency, complete coverage",  price:199, features:["Unlimited service visits","24/7 emergency response (1-hr SLA)","20% discount on parts and labor","All filters and basic parts included","Annual remodeling consultation","Warranty management service"] },
  ];

  for (let i = 0; i < plans.length; i++) {
    const pl = plans[i];
    const featList = pl.features.map((_, j) => `$${j + 5}`).join(",");
    const sortParam = pl.features.length + 5;
    await pool.query(
      `INSERT INTO "ServicePlan" (id,name,description,price,interval,features,"isActive","sortOrder","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,'monthly',ARRAY[${featList}],true,$${sortParam},NOW(),NOW())`,
      [randomUUID(), pl.name, pl.desc, pl.price, ...pl.features, i + 1]
    );
  }
  console.log("✓ Service plans (3)");

  console.log("\n🎉 Seeding complete!\n");
  console.log("────────────────────────────────────────────────");
  console.log("Test accounts (password: Dada2026!):");
  console.log("  TECHNICIAN  carlos@dada-house.com");
  console.log("              david@dada-house.com");
  console.log("              miguel@dada-house.com");
  console.log("              robert@dada-house.com");
  console.log("  DISPATCHER  sarah@dada-house.com");
  console.log("  CLIENT      jennifer.martinez@email.com");
  console.log("              michael.brown@email.com");
  console.log("              patricia.davis@email.com");
  console.log("────────────────────────────────────────────────");
}

main().catch(console.error).finally(() => pool.end());
