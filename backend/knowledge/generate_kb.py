"""
Generator script to build curated, high-accuracy agricultural knowledge base
for FarmMate's RAG Agri-Advisor Chatbot.
"""
import json
import os

KNOWLEDGE_DOCS = [
    {
        "id": "paddy_cultivation",
        "category": "crop_guide",
        "title": "Paddy (Rice) Complete Cultivation, Sowing & Fertilizer Schedule",
        "keywords": ["paddy", "rice", "sowing", "nursery", "urea", "dap", "mop", "transplanting", "npk", "basal dose"],
        "source": "ICAR - National Rice Research Institute (NRRI) & Agronomy Guidelines",
        "content": """
Paddy (Oryza sativa) is the primary cereal crop of India grown in Kharif and Rabi/Boro seasons.
- Nursery & Sowing: Prepare wet nursery bed with 40-50 kg certified seed per hectare for conventional transplanting, or 5-7 kg/ha for SRI (System of Rice Intensification). Treat seeds with Trichoderma viride (10g/kg) or Carbendazim (2g/kg) to prevent seedling blight.
- Transplanting: 20-25 day old seedlings (4-5 leaf stage) at 20x15 cm spacing (2-3 seedlings per hill).
- Fertilizer Dose (NPK): 120:60:40 kg/ha for high-yielding varieties.
  1. Basal Application (at last puddling): 50% Nitrogen (Urea), 100% Phosphorus (DAP/SSP), and 50% Potassium (MOP). Also apply 25 kg/ha Zinc Sulphate (do not mix zinc directly with DAP).
  2. First Top Dressing (Active Tillering stage, 20-25 days after transplanting): 25% Nitrogen (Urea).
  3. Second Top Dressing (Panicle Initiation stage, 40-45 days after transplanting): Remaining 25% Nitrogen + remaining 50% Potassium (MOP) to boost grain weight and reduce lodging.
- Water Management: Maintain 2-3 cm shallow water during transplanting and active tillering. Adopt Alternate Wetting and Drying (AWD) to save 25-30% water and reduce methane emissions without lowering yield. Drain water 10-12 days before harvest.
"""
    },
    {
        "id": "paddy_pest_disease",
        "category": "pest_disease",
        "title": "Paddy (Rice) Major Pests & Diseases: Blast, Stem Borer, BPH & Blight",
        "keywords": ["paddy", "rice", "blast", "stem borer", "dead heart", "white earhead", "brown planthopper", "bph", "bacterial leaf blight", "sheath blight", "mancozeb", "chlorantraniliprole"],
        "source": "Directorate of Rice Research (ICAR-IIRR) IPM Manual",
        "content": """
Major pests and diseases in Paddy (Rice) with eco-friendly and chemical management:
1. Yellow Stem Borer (Scirpophaga incertulas):
   - Symptoms: 'Dead heart' during vegetative stage, 'White earhead' with chaffy grains during reproductive stage.
   - Organic / IPM: Install 8-10 pheromone traps/acre with Scirpo-lure; release egg parasitoid Trichogramma japonicum @ 50,000/ha weekly.
   - Chemical: Chlorantraniliprole 18.5% SC @ 60 ml/acre (0.3 ml/L water) or Cartap Hydrochloride 4G granules @ 10 kg/acre in standing water.
2. Brown Plant Hopper (BPH):
   - Symptoms: Circular drying patches in field ('Hopper burn'), stunted plants covered with sooty mold.
   - Management: Provide 'alleyways' (skip 1 row every 2-3 meters) for aeration. Avoid excess Urea.
   - Spray: Pymetrozine 50% WDG @ 120 g/acre or Triflumezopyrim 10% SC @ 94 ml/acre directed towards the base of the plant.
3. Rice Blast (Magnaporthe oryzae):
   - Symptoms: Spindle-shaped lesions with brown borders and grey centers on leaves (Leaf blast), blackened node and rotting panicle neck (Neck blast).
   - Spray: Tricyclazole 75% WP @ 120-160 g/acre (0.6-0.8 g/L) or Isoprothiolane 40% EC @ 300 ml/acre at initial symptom appearance.
4. Bacterial Leaf Blight (Xanthomonas oryzae):
   - Symptoms: Water-soaked wavy lesions starting from leaf tips turning yellowish-white with bacterial ooze.
   - Spray: Streptocycline 0.1 g/L (6 g per 60 L water) mixed with Copper Oxychloride 50% WP @ 2.5 g/L. Drain field and suspend top dressing of nitrogen until disease ceases.
"""
    },
    {
        "id": "wheat_cultivation_fertilizer",
        "category": "crop_guide",
        "title": "Wheat Cultivation, Critical Irrigation Stages & Nutrient Guide",
        "keywords": ["wheat", "rabi", "sowing", "cri", "crown root initiation", "urea", "dap", "yellow rust", "irrigation"],
        "source": "ICAR - Indian Institute of Wheat and Barley Research (IIWBR)",
        "content": """
Wheat (Triticum aestivum) is India's principal Rabi cereal requiring cool winters and mild dry harvest temperatures.
- Sowing Time & Seed Rate:
  - Timely Sown: 1st to 20th November (100 kg seed/ha, spacing 20-22.5 cm).
  - Late Sown: Up to 15th December (125 kg seed/ha, spacing 18-20 cm).
  - Seed Treatment: Carboxin + Thiram (Vitavax) @ 2-2.5 g/kg seed to prevent loose smut and flag smut.
- Critical Irrigation Stages:
  1. Crown Root Initiation (CRI) at 20-25 days after sowing - MOST CRITICAL. Delaying this reduces tillering drastically.
  2. Tillering stage (40-45 DAS).
  3. Late Jointing / Boot stage (60-65 DAS).
  4. Flowering / Anthesis stage (80-85 DAS).
  5. Milking stage (100-105 DAS).
  6. Dough stage (115-120 DAS).
- Fertilizer Dosage: 120:60:40 kg NPK/ha.
  - Basal: Entire P (DAP) and K (MOP) + 1/3rd Nitrogen (Urea) at final land preparation.
  - 1st Top Dressing: 1/3rd Nitrogen immediately after first irrigation (CRI stage).
  - 2nd Top Dressing: Remaining 1/3rd Nitrogen at jointing stage before boot leaf stage.
- Yellow / Stripe Rust Management: Spray Propiconazole 25% EC (Tilt) @ 1 ml/L (200 ml in 200 L water/acre) upon observing yellow powdery stripes on leaves.
"""
    },
    {
        "id": "cotton_ipm_fertilizer",
        "category": "crop_guide",
        "title": "Cotton Package of Practices: Pink Bollworm, Sucking Pests & Nutrient Plan",
        "keywords": ["cotton", "kapas", "pink bollworm", "whitefly", "thrips", "aphids", "fertilizer", "spacing", "refuge", "neem"],
        "source": "ICAR - Central Institute for Cotton Research (CICR)",
        "content": """
Cotton (Gossypium spp.) is a premier fiber and commercial cash crop grown in black and alluvial soils.
- Spacing: 90 x 60 cm or 120 x 45 cm for Bt cotton hybrid varieties.
- Nutrient Management: 120:60:60 kg NPK/ha.
  - Basal: 25% N + 100% P + 50% K.
  - Split applications: Apply remaining 75% N in 3 equal splits at squaring (30-35 DAS), flowering (60-65 DAS), and peak boll development (85-90 DAS). Apply remaining 50% K at peak flowering to enhance boll weight and fiber strength.
  - Foliar spray of 1-2% Potassium Nitrate (13:0:45) or Magnesium Sulphate (1%) during flowering and boll formation prevents leaf reddening.
- Sucking Pests Management (Whitefly, Jassids, Thrips, Aphids):
  - Install yellow and blue sticky traps (15-20 traps/acre).
  - Spray Neem Oil (Azadirachtin 10,000 ppm) @ 3 ml/L or Flonicamid 50% WG @ 80 g/acre or Diafenthiuron 50% WP @ 200 g/acre.
- Pink Bollworm (Pectinophora gossypiella) IPM:
  - Install 8 pheromone traps/acre with Gossyplure for monitoring (ETL: 8 moths/trap/night for 3 consecutive days or 10% rosette flowers).
  - Spray Profenofos 50% EC @ 2 ml/L or Chlorantraniliprole 18.5% SC @ 0.3 ml/L.
  - Avoid rationing of Bt cotton to break pest lifecycle.
"""
    },
    {
        "id": "maize_fall_armyworm",
        "category": "crop_guide",
        "title": "Maize (Corn) Cultivation & Fall Armyworm (FAW) Management",
        "keywords": ["maize", "corn", "fall armyworm", "faw", "seed rate", "urea", "stem borer", "spodoptera frugiperda"],
        "source": "ICAR - Indian Institute of Maize Research (IIMR)",
        "content": """
Maize requires well-drained loamy soils rich in organic matter.
- Sowing: Seed rate 20 kg/ha for hybrids. Spacing 60 x 20 cm. Seed treatment with Cyantraniliprole 19.8% + Thiamethoxam 19.8% FS @ 4 ml/kg seed protects seedlings from pests for 20 days.
- Fertilizer: 120:60:40 kg NPK/ha.
  - Apply 1/3rd N + 100% P + 100% K as basal.
  - 1/3rd N at knee-high stage (30-35 DAS).
  - 1/3rd N at tasseling/silking stage (50-55 DAS).
- Fall Armyworm (Spodoptera frugiperda) Complete Control:
  - Symptoms: Ragged whorl holes with sawdust-like fecal frass, damaged emerging cobs.
  - Non-Chemical / Cultural: Deep summer ploughing, apply 1:1 mixture of sand and wood ash into the whorls. Install FAW pheromone traps @ 10/acre.
  - Biopesticide: Metarhizium rileyi or Bacillus thuringiensis (Bt) kurstaki @ 2 g/L during early instars.
  - Chemical (Whorl Application): Emamectin Benzoate 5% SG @ 0.4 g/L (80 g/acre) or Chlorantraniliprole 18.5% SC @ 0.4 ml/L directed into plant whorls.
"""
    },
    {
        "id": "tomato_chilli_vegetables",
        "category": "crop_guide",
        "title": "Tomato and Chilli: Blight, Fruit Borer, Thrips, Leaf Curl & Nutrition",
        "keywords": ["tomato", "chilli", "mirchi", "leaf curl", "early blight", "late blight", "fruit borer", "thrips", "mites", "staking"],
        "source": "ICAR - Indian Institute of Horticultural Research (IIHR)",
        "content": """
Horticultural Cash Crops - Tomato and Chilli Package of Practices:
1. Tomato (Solanum lycopersicum):
   - Spacing: 60 x 60 cm (determinate) or 90 x 45 cm (indeterminate with bamboo staking).
   - Early Blight (Alternaria solani): Concentric target-board rings on leaves. Spray Mancozeb 75% WP @ 2.5 g/L or Chlorothalonil 75% WP @ 2 g/L.
   - Late Blight (Phytophthora infestans): Water-soaked lesions under cool, humid weather. Spray Metalaxyl 8% + Mancozeb 64% WP (Ridomil MZ) @ 2.5 g/L.
   - Fruit Borer (Helicoverpa armigera): Plant African marigold as trap crop (1 marigold row every 16 tomato rows). Spray Emamectin benzoate @ 0.5 g/L.
   - Blossom End Rot: Black necrotic patch on fruit bottom caused by Calcium deficiency and erratic watering. Spray Calcium Nitrate @ 5 g/L foliar.
2. Chilli (Capsicum annuum):
   - Leaf Curl Virus (Murda disease): Upward curling caused by Thrips; downward curling caused by Mites.
   - Management: Dip seedling roots in Imidacloprid (0.5 ml/L) for 15 mins before transplanting.
   - For Thrips: Spray Fipronil 5% SC @ 2 ml/L or Spinetoram 11.7% SC @ 1 ml/L.
   - For Mites: Spray Spiromesifen 22.9% SC @ 1 ml/L or Propergite 57% EC @ 2 ml/L.
   - Die-back and Anthracnose Fruit Rot: Spray Copper Oxychloride 50% WP @ 2.5 g/L or Azoxystrobin 23% SC @ 1 ml/L at flowering.
"""
    },
    {
        "id": "pulses_chickpea_redgram",
        "category": "crop_guide",
        "title": "Pulses Cultivation: Bengal Gram (Chickpea), Red Gram (Pigeonpea) & Wilt Control",
        "keywords": ["chickpea", "bengal gram", "chana", "red gram", "toor", "pigeonpea", "wilt", "pod borer", "rhizobium", "dap"],
        "source": "ICAR - Indian Institute of Pulses Research (IIPR)",
        "content": """
Pulses enrich soil through biological nitrogen fixation and require minimal inputs.
- Seed Inoculation (Crucial for Pulses):
  - Inoculate seeds with Rhizobium culture (250 g/10 kg seed) + Phosphate Solubilizing Bacteria (PSB) (250 g/10 kg seed) using 10% jaggery solution. Dries in shade for 30 minutes before sowing.
- Fertilizer: 20:50:20 kg NPK/ha. Pulses need very low nitrogen as roots fix atmospheric nitrogen, but high phosphorus (DAP / Single Super Phosphate) for nodulation and root vigour. Apply 20 kg Sulphur/ha for higher protein yield.
- Fusarium Wilt (Fusarium oxysporum):
  - Symptoms: Dropping of petioles, internal vascular browning, yellowing and drying of plants in patches.
  - Treatment: Seed treatment with Trichoderma viride @ 10 g/kg seed + soil application of Trichoderma @ 2.5 kg enriched in 250 kg FYM per acre before sowing. Deep summer ploughing and crop rotation with sorghum or millets.
- Pod Borer (Helicoverpa armigera):
  - Install 5 pheromone traps/acre with Helilure.
  - Spray HaNPV (Nuclear Polyhedrosis Virus) @ 250 LE/ha or Indoxacarb 14.5% SC @ 1 ml/L or Chlorantraniliprole 18.5% SC @ 0.3 ml/L at early pod formation.
"""
    },
    {
        "id": "soil_health_fertilizer_management",
        "category": "soil_fertilizer",
        "title": "Soil Health Management, N-P-K Roles, Micronutrients & pH Correction",
        "keywords": ["soil", "nitrogen", "phosphorus", "potassium", "ph", "alkaline", "acidic", "lime", "gypsum", "zinc", "iron", "organic carbon"],
        "source": "ICAR - Indian Institute of Soil Science (IISS) Bhopal",
        "content": """
Comprehensive Soil Fertility & Plant Nutrition Guide:
1. Primary Nutrients:
   - Nitrogen (N): Promotes vegetative leafy green growth and chlorophyll. Deficiency causes general yellowing of older leaves. Excess delays maturity and invites pests.
   - Phosphorus (P): Essential for root development, seed germination, and tillering. Deficiency causes purplish-red discoloration on leaves and stunted roots.
   - Potassium (K): Strengthens cell walls, regulates stomatal water loss, provides disease/drought resistance, and improves grain/fruit weight. Deficiency shows burnt leaf margins.
2. Micronutrient Deficiencies & Corrections:
   - Zinc (Zn): Critical for rice, maize, wheat. Symptoms: Khaira disease in rice, white bud in maize, chlorosis between veins. Spray Zinc Sulphate (ZnSO4 21%) @ 5 g/L with 2.5 g slaked lime per litre.
   - Iron (Fe): Common in high pH / calcareous soils. Symptoms: Interveinal chlorosis on youngest leaves turning bleached white. Foliar spray Ferrous Sulphate (FeSO4 19%) @ 5 g/L + 1 g citric acid.
   - Boron (B): Cracking of fruits (tomato, pomegranate), hollow heart in cauliflower. Spray Solubor (Borax 20%) @ 1-1.5 g/L at pre-flowering.
3. Soil pH Correction:
   - Acidic Soil (pH < 6.0): Restricts P, Ca, Mg availability; Al toxicity. Apply Agricultural Limestone (CaCO3) or Dolomite @ 2-4 tonnes/ha based on buffer pH test.
   - Alkaline / Sodic Soil (pH > 8.5): High exchangeable sodium degrades soil structure. Apply Agricultural Gypsum (CaSO4.2H2O) @ 2-5 tonnes/ha followed by heavy leaching with fresh water.
4. Improving Organic Carbon:
   - Incorporate 10-12 tonnes Farm Yard Manure (FYM) or 3-5 tonnes Vermicompost per hectare.
   - Sow green manuring crops like Dhaincha (Sesbania aculeata) or Sunhemp (Crotalaria juncea) and incorporate into soil at 45-50 days before flowering.
"""
    },
    {
        "id": "organic_farming_biofertilizers",
        "category": "soil_fertilizer",
        "title": "Natural & Organic Farming: Jeevamrutha, Panchagavya, Neem & Biofertilizers",
        "keywords": ["organic", "natural farming", "jeevamrutha", "panchagavya", "neem cake", "vermicompost", "cow dung", "biofertilizer"],
        "source": "National Centre of Organic and Natural Farming (NCONF) & ICAR",
        "content": """
Natural, Zero Budget & Organic Farming Preparations:
1. Jeevamrutha Preparation (for 1 acre):
   - Ingredients: 200 Litres water + 10 kg fresh indigenous (Desi) cow dung + 5 to 10 Litres cow urine + 2 kg jaggery + 2 kg pulse flour (besan) + handful of virgin forest/fertile bund soil.
   - Fermentation: Mix thoroughly in a plastic drum; keep in shade covered with gunny bag. Stir clockwise 2-3 times daily for 5-7 days.
   - Application: Apply 200 L/acre through irrigation water or filter and spray @ 10% solution (1 L per 10 L water) every 15-21 days. Enriches millions of beneficial soil microflora.
2. Panchagavya (Organic Growth Promoter):
   - Made from 5 cow products: Cow dung (7 kg), cow ghee (1 kg), fresh cow urine (10 L), cow milk (3 L), cow curd (2 L), plus tender coconut water (3 L), sugarcane juice/jaggery (3 kg), and 12 ripe bananas.
   - Mix dung and ghee for 3 days; add remaining ingredients and ferment for 18 days with daily stirring.
   - Dosage: 300 ml per 10 L water (3% foliar spray) during vegetative, flowering, and fruiting stages.
3. Biofertilizers:
   - Azotobacter / Azospirillum: Free-living/associative bacteria fixing 20-30 kg N/ha in non-legume crops.
   - Phosphate Solubilizing Bacteria (PSB): Solubilizes insoluble fixed soil phosphates.
   - VAM (Mycorrhizae): Fungi that multiply root surface area 100x to extract deep moisture and phosphorus.
4. Botanical Insect Repellents:
   - Neem Seed Kernel Extract (NSKE 5%): Soak 5 kg crushed neem seed powder in 100 L water with 100 g soap powder overnight. Filter and spray against sucking pests and caterpillars.
"""
    },
    {
        "id": "drip_sprinkler_irrigation",
        "category": "irrigation",
        "title": "Micro-Irrigation: Drip, Sprinkler, Fertigation & Water Saving",
        "keywords": ["drip", "sprinkler", "irrigation", "water saving", "fertigation", "venturi", "subsidy", "per drop more crop"],
        "source": "National Mission on Micro Irrigation & ICAR-CIAE",
        "content": """
Micro-Irrigation Technologies and Fertigation:
1. Drip Irrigation:
   - Delivers precise water and soluble fertilizers directly to the crop root zone at low pressure (1.0 to 1.5 kg/cm2).
   - Benefits: 40-60% water saving compared to surface flood irrigation; 30-40% yield increase; 80% reduction in weed growth; allows farming on undulating terrain.
   - Recommended For: Vegetables (tomato, chilli, brinjal, onion), fruits (banana, papaya, mango, citrus), sugarcane, cotton.
2. Fertigation Management:
   - Injecting water-soluble fertilizers (e.g. 19-19-19, Urea, Potassium Nitrate 13-0-45, MAP 12-61-0) through a Venturi injector or fertilizer tank.
   - Fertilizer use efficiency increases from 30-40% (broadcast) to 80-90% (fertigation).
   - Maintenance: Flush laterals with 0.1% Hydrochloric acid (HCl) every 6 months to remove calcium/algae blockages from drippers.
3. Sprinkler Irrigation:
   - Sprays water uniformly like rainfall over crops. Suitable for sandy/undulating soils and close-spaced crops like wheat, groundnut, mustard, pulses, and fodder. Saves 25-35% water.
4. Subsidies:
   - Central & State schemes under PMKSY 'Per Drop More Crop' provide 45% to 55% subsidy (up to 70-90% in certain states for small/marginal and SC/ST farmers).
"""
    },
    {
        "id": "pm_kisan_scheme",
        "category": "government_scheme",
        "title": "PM-KISAN: Pradhan Mantri Kisan Samman Nidhi Benefits, eKYC & Eligibility",
        "keywords": ["pm-kisan", "pm kisan", "6000", "installment", "ekyc", "scheme", "subsidy", "dbt", "eligibility", "portal"],
        "source": "Ministry of Agriculture & Farmers Welfare, Govt. of India (pmkisan.gov.in)",
        "content": """
Pradhan Mantri Kisan Samman Nidhi (PM-KISAN):
- Objective: Central sector financial support scheme for landholding farmer families across India to supplement agricultural input costs and domestic needs.
- Financial Benefit: ₹6,000 per year transferred directly into the Aadhaar-seeded bank account (DBT) of eligible farmers in three equal 4-monthly installments of ₹2,000 each:
  - Period 1: April to July
  - Period 2: August to November
  - Period 3: December to March
- Mandatory Requirements:
  1. Land record seeded in the State portal in the farmer's name.
  2. Aadhaar-Bank Account linkage with active NPCI/DBT mapping.
  3. Completion of mandatory e-KYC (via OTP on pmkisan.gov.in, biometric at CSC centre, or Face Authentication on PM-KISAN mobile app).
- Ineligibility:
  - Institutional landholders.
  - Farmers or family members holding constitutional posts, serving/retired central or state government officers/employees.
  - Pensioners with monthly pension of ₹10,000 or more.
  - Income tax payers in last assessment year.
  - Professionals like Doctors, Engineers, Lawyers, Chartered Accountants.
- Farmer Helpline: Official Toll-Free 155261 / 1800115526 or 011-24300606.
"""
    },
    {
        "id": "pmfby_crop_insurance",
        "category": "government_scheme",
        "title": "PMFBY: Pradhan Mantri Fasal Bima Yojana Crop Insurance Claims & Cover",
        "keywords": ["pmfby", "crop insurance", "fasal bima", "premium", "drought", "flood", "hailstorm", "claim", "72 hours"],
        "source": "Ministry of Agriculture & Farmers Welfare (pmfby.gov.in)",
        "content": """
Pradhan Mantri Fasal Bima Yojana (PMFBY):
- Comprehensive yield-based and localized crop insurance scheme protecting farmers against unforeseen natural risks from pre-sowing to post-harvest.
- Farmer Premium Contribution:
  - Kharif Crops (Food grains & Oilseeds): Maximum 2.0% of Sum Insured.
  - Rabi Crops (Wheat, Mustard, Gram): Maximum 1.5% of Sum Insured.
  - Annual Commercial & Horticultural Crops (Cotton, Sugarcane, Chilli, Vegetables): Maximum 5.0% of Sum Insured.
  - Balance premium is heavily subsidized and shared equally between Central and State governments.
- Risks Covered:
  1. Prevented Sowing / Planting risk due to deficit rainfall or adverse seasonal conditions.
  2. Standing Crop Losses (drought, flood, unseasonal inundation, pest/disease epidemic, landslide, lightning).
  3. Post-Harvest Losses (up to 14 days after harvest for crops cut and spread in the field to dry, caused by cyclones/cyclonic rains).
  4. Localized Calamities (hailstorm, landslide, cloudburst, inundation).
- How to Claim for Localized Calamities / Post-Harvest Damage:
  - Must report the damage within 72 HOURS through the 'Crop Insurance App' or call Toll-Free 14447 or inform the local Agriculture Officer / Bank Branch.
"""
    },
    {
        "id": "kcc_kisan_credit_card",
        "category": "government_scheme",
        "title": "Kisan Credit Card (KCC): Low-Interest Agricultural Loans & Limits",
        "keywords": ["kcc", "kisan credit card", "loan", "interest subvention", "crop loan", "bank", "collateral", "credit"],
        "source": "Reserve Bank of India (RBI) & NABARD",
        "content": """
Kisan Credit Card (KCC) Scheme:
- Objective: Provides adequate and timely short-term credit to farmers for crop cultivation, post-harvest expenses, farm asset maintenance, and allied activities (dairy, fisheries, poultry).
- Interest Rates & Subvention:
  - Normal interest rate is 9%.
  - The Government provides an Interest Subvention of 2%, reducing the rate to 7%.
  - On Prompt Repayment before due date, farmers receive an additional 3% Prompt Repayment Incentive (PRI), bringing the effective interest rate down to just 4% per annum!
- Credit Limit:
  - Flexible revolving credit based on landholding size, cropping pattern, and scale of finance fixed by the District Level Technical Committee (DLTC).
  - Loans up to ₹1,60,000 are collateral-free (no mortgage of land required). Can go up to ₹3,00,000 for tie-up arrangements.
- Validity:
  - KCC is valid for 5 years with an annual review and an inbuilt 10% annual increase in limit to cover inflation and cropping cost increases.
- Documents Required:
  - Land revenue record (Pahani / 7/12 extract / Patta passbook), Aadhaar card, PAN card, passport photograph, and crop cultivation plan. Apply at any commercial, cooperative, or Regional Rural Bank (RRB).
"""
    },
    {
        "id": "soil_health_card_scheme",
        "category": "government_scheme",
        "title": "Soil Health Card Scheme: Testing 12 Parameters & Fertilizer Recommendations",
        "keywords": ["soil health card", "soil testing", "npk", "micronutrients", "organic carbon", "ph", "ec", "scheme"],
        "source": "Ministry of Agriculture & Farmers Welfare (soilhealth.dac.gov.in)",
        "content": """
Soil Health Card (SHC) Scheme:
- Government of India initiative to issue printed Soil Health Cards to all farmers once every 2-3 years, assessing the health of their soil and curbing over-fertilization.
- 12 Crucial Soil Parameters Tested:
  1. Macro-nutrients: Nitrogen (N), Phosphorus (P), Potassium (K).
  2. Secondary nutrient: Sulphur (S).
  3. Micronutrients: Zinc (Zn), Iron (Fe), Copper (Cu), Manganese (Mn), Boron (B).
  4. Physical/Chemical parameters: pH (acidity/alkalinity), Electrical Conductivity (EC - salinity indicator), Organic Carbon (OC %).
- Benefits to Farmers:
  - Gives crop-wise customized recommendations for chemical and organic fertilizers.
  - Prevents indiscriminate use of Urea and DAP, reducing input costs by 15-25% while increasing yields by 8-12%.
- How to get Soil Tested:
  - Soil samples collected using 'V-shape' cut up to 15 cm depth across 8-10 spots in a zig-zag pattern across the field, dried in shade, and submitted to the nearest Krishi Vigyan Kendra (KVK) or District Soil Testing Laboratory.
"""
    },
    {
        "id": "weather_contingency_farming",
        "category": "weather_calendar",
        "title": "Weather Contingency Plan: Floods, Droughts, Heatwaves & Cold Waves",
        "keywords": ["weather", "heavy rain", "drainage", "drought", "heatwave", "frost", "cold wave", "cyclone", "contingency"],
        "source": "ICAR-CRIDA (Central Research Institute for Dryland Agriculture)",
        "content": """
Weather Contingency & Climate-Resilient Agricultural Practices:
1. Heavy Rain & Waterlogging Management:
   - Make deep drainage channels every 10-15 rows to drain stagnant water immediately; standing water for > 48 hours causes root hypoxia and rot in maize, cotton, pulses, and vegetables.
   - Post-rain foliar spray: Once water recedes, spray 1% Urea + 1% Potassium Nitrate (13:0:45) to revive stressed plants, followed by Copper Oxychloride @ 2.5 g/L to prevent collar rot.
2. Dry Spell & Drought Mitigation:
   - Provide life-saving protective irrigation at critical growth stages through drip or sprinkler.
   - Apply dry straw / crop residue mulch (5-7 cm thickness) to conserve soil moisture.
   - Spray 2% Potassium Chloride (MOP) or 1% Kaolin (anti-transpirant) to minimize leaf transpirational loss during dry spells.
3. Heatwave & Extreme Temperature (> 40°C):
   - Provide light, frequent night or early-morning irrigations. Avoid midday flood watering.
   - Spray 0.5% Zinc Sulphate or 1% Potassium Nitrate to induce heat tolerance during flowering and pollination.
4. Frost & Cold Wave Protection (Winter in North/Central India):
   - Provide light evening irrigation; wet soil retains daytime heat and raises ground temperature by 1-2°C.
   - Create smoke cover (smudging) on northern and western field borders using dried weed heaps during midnight hours to trap radiating heat.
"""
    }
]

def main():
    dest_path = os.path.join(os.path.dirname(__file__), "agri_knowledge.json")
    with open(dest_path, "w", encoding="utf-8") as f:
        json.dump(KNOWLEDGE_DOCS, f, indent=2, ensure_ascii=False)
    print(f"Successfully generated {len(KNOWLEDGE_DOCS)} knowledge base documents at {dest_path}")

if __name__ == "__main__":
    main()
