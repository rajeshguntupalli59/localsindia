"""
The one list of subcategories and posting questions for every category.

Web and mobile both read this through GET /api/v1/categories/catalog, so a
question added here shows up on both without an app release. Answers are
stored in `listings.attributes` (JSONB) and validated by `validate_answers`.

Rules:
- A category's own `questions` are the legacy set the already-installed
  mobile app sends (it doesn't know about subcategories). Keep those keys and
  option values working — new options may be added, old ones must not go.
- A subcategory's `questions` are the full list asked when it is picked.
  `required` is only set on subcategory questions, so legacy posts never fail.
- Subcategories live only here (not as `categories` rows): a listing or
  business stores the slug in `subcategory_slug`, checked against this list
  on write. Slugs must be unique across the whole catalog and must never be
  renamed once used — saved rows point at them.
- `filter: True` marks questions the listing search can filter on
  (select/multiselect/switch = exact match, number = min/max range).
"""

YEAR_NOW = 2026

# Keep it short and tappable: each subcategory asks only what buyers decide
# or filter on (about 6 questions at most), as pick-an-option chips wherever
# the answers can be listed. Free text only where they can't (e.g. car model).
# Title, description, price, area and photos are asked separately already.

CONDITION = ["New", "Like New", "Good", "Fair"]
FASHION_CONDITION = ["New with tags", "Like New", "Used"]
POSTED_BY = ["Owner", "Agent", "Builder"]
FACING = ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"]
MEAL_TYPE = ["Veg", "Non-Veg", "Both"]
EXPERIENCE = ["Under 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"]
JOB_EXPERIENCE = ["Fresher", "Under 1 year", "1-3 years", "3-5 years", "5+ years"]
WHEN = ["Morning", "Afternoon", "Evening", "Sundays too", "24x7"]
SUBJECTS = ["Maths", "Science", "English", "Social", "Hindi", "Telugu", "Computers", "All subjects"]
CUISINES = ["South Indian", "North Indian", "Andhra / Telangana", "Biryani", "Chinese", "Continental", "Other"]
FURNITURE_MATERIAL = ["Wood", "Engineered wood", "Metal", "Plastic", "Cane / Bamboo", "Other"]
CAR_BRANDS = ["Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Honda", "Toyota", "Kia", "Renault",
              "Volkswagen / Skoda", "MG", "Other"]
BIKE_BRANDS = ["Hero", "Honda", "Bajaj", "TVS", "Royal Enfield", "Yamaha", "Suzuki", "KTM", "Ather",
               "Ola Electric", "Other"]
PHONE_BRANDS = ["Apple", "Samsung", "Xiaomi / Redmi / Poco", "OnePlus", "Vivo", "Oppo", "Realme", "Motorola",
                "Google Pixel", "Other"]
LAPTOP_BRANDS = ["HP", "Dell", "Lenovo", "Apple", "Asus", "Acer", "MSI", "Other"]
TV_BRANDS = ["Samsung", "LG", "Sony", "Xiaomi / Mi", "TCL", "OnePlus", "boAt", "JBL", "Other"]
APPLIANCE_BRANDS = ["LG", "Samsung", "Whirlpool", "Godrej", "Voltas", "IFB", "Bosch", "Haier", "Other"]
CAMERA_BRANDS = ["Canon", "Nikon", "Sony", "Fujifilm", "GoPro", "Other"]
PG_AMENITIES = ["WiFi", "AC", "Food", "Laundry", "Parking", "Power Backup",
                "Housekeeping", "CCTV", "Attached Bathroom", "Geyser", "Fridge", "TV"]


def q(key, label, type_="text", *, options=None, placeholder=None, unit=None,
      min_=None, max_=None, required=False, filter_=False):
    d = {"key": key, "label": label, "type": type_}
    if options is not None:
        d["options"] = options
    if placeholder:
        d["placeholder"] = placeholder
    if unit:
        d["unit"] = unit
    if min_ is not None:
        d["min"] = min_
    if max_ is not None:
        d["max"] = max_
    if required:
        d["required"] = True
    if filter_:
        d["filter"] = True
    return d


def req(question):
    """Same question, but required."""
    return {**question, "required": True}


def pick(key, label, options, required=False):
    """A filterable single-choice question — the default shape."""
    return q(key, label, "select", options=options, required=required, filter_=True)


def pick_many(key, label, options, required=False):
    return q(key, label, "multiselect", options=options, required=required, filter_=True)


def yes_no(key, label):
    return q(key, label, "switch", filter_=True)


# ── Reusable questions ──────────────────────────────────────────────────────
condition = pick("condition", "Condition", CONDITION)
fashion_condition = pick("condition", "Condition", FASHION_CONDITION)
item_age = pick("item_age", "How old is it", ["Under 6 months", "6-12 months", "1-2 years", "2-5 years", "Over 5 years"])
experience = pick("experience", "Experience", EXPERIENCE)
year = q("year", "Year", "number", min_=1950, max_=YEAR_NOW, filter_=True, placeholder="e.g. 2019")
km_driven = q("km_driven", "KM Driven", "number", unit="km", min_=0, max_=1_000_000, filter_=True, placeholder="e.g. 45000")
owner = pick("owner", "Owner", ["1st owner", "2nd owner", "3rd owner or more"])
deposit = q("deposit_amount", "Deposit", "number", unit="₹", min_=0, max_=10_000_000, placeholder="e.g. 10000")
sqft = q("sqft", "Area", "number", unit="sq.ft", min_=50, max_=1_000_000, filter_=True, placeholder="e.g. 1200")
bhk = q("bhk", "BHK", "number", min_=1, max_=10, filter_=True, placeholder="e.g. 2")
furnishing = pick("furnishing", "Furnishing", ["Furnished", "Semi-furnished", "Unfurnished"])
posted_by = pick("posted_by", "Posted by", POSTED_BY)
facing = pick("facing", "Facing", FACING)
pg_gender = pick("gender_preference", "For", ["Male", "Female", "Any"])
meal_type = pick("meal_type", "Food Type", MEAL_TYPE)
cuisine = pick_many("cuisine", "Cuisine", CUISINES)
home_delivery = yes_no("home_delivery", "Home delivery")
emergency = yes_no("emergency_service", "Same-day / emergency service")
available_when = pick_many("available_when", "Available", WHEN)
fee = q("consultation_fee", "Consultation Fee", "number", unit="₹", min_=0, max_=100_000, placeholder="e.g. 500")
gender_fashion = pick("gender", "For", ["Men", "Women", "Unisex", "Kids"])
under_warranty = yes_no("under_warranty", "Under warranty")
bill = q("bill_available", "Original bill available", "switch")
material = pick("material", "Material", FURNITURE_MATERIAL)
online_offline = pick("mode", "Mode", ["Online", "Offline", "Hybrid"])
batch_when = pick_many("batch_when", "Batch timings", ["Morning", "Evening", "Weekends"])
salary_min = q("salary_min", "Min Salary", "number", unit="₹/month", min_=0, max_=10_000_000, placeholder="e.g. 15000")
salary_max = q("salary_max", "Max Salary", "number", unit="₹/month", min_=0, max_=10_000_000, placeholder="e.g. 25000")
job_type = pick("job_type", "Job Type", ["Full-time", "Part-time", "Contract", "Internship"])
experience_level = pick("experience_level", "Experience needed", JOB_EXPERIENCE)
company = q("company_name", "Company / Employer Name", placeholder="e.g. Acme Pvt Ltd")


def job_sub(slug, name, *extra, placeholder=None):
    """Employer, salary, job type, experience + one or two role questions."""
    s = {"slug": slug, "name": name,
         "questions": [req(company), salary_min, salary_max, req(job_type), experience_level] + list(extra)}
    if placeholder:
        s["title_placeholder"] = placeholder
    return s


def service_sub(slug, name, *questions, placeholder=None, price_label="Starting Price (₹)"):
    s = {"slug": slug, "name": name, "price_label": price_label, "questions": list(questions)}
    if placeholder:
        s["title_placeholder"] = placeholder
    return s


CATALOG: list[dict] = [
    {
        "slug": "classifieds",
        "questions": [condition],
        "subcategories": [
            {"slug": "books-stationery", "name": "Books & Stationery", "questions": [
                req(condition), pick("book_type", "Type", [
                    "School / College textbooks", "Competitive exam books", "Novels & Stories", "Stationery", "Other"])]},
            {"slug": "sports-fitness", "name": "Sports & Fitness", "questions": [
                req(condition), pick("sport_type", "Type", [
                    "Gym equipment", "Cricket", "Badminton / Tennis", "Football", "Cycling gear", "Other"]), item_age]},
            {"slug": "kids-baby", "name": "Kids & Baby", "questions": [
                req(condition), pick("age_group", "Age group", ["0-1 years", "1-3 years", "3-6 years", "6-12 years"])]},
            {"slug": "musical-instruments", "name": "Musical Instruments", "questions": [
                req(condition), pick("instrument_type", "Instrument", [
                    "Guitar", "Keyboard / Piano", "Drums / Percussion", "Violin", "Flute", "Other"]), item_age]},
            {"slug": "home-kitchen", "name": "Home & Kitchen", "questions": [
                req(condition), pick("kitchen_type", "Type", [
                    "Cookware & utensils", "Small appliances", "Storage & containers", "Cleaning", "Other"]), item_age]},
            {"slug": "other-items", "name": "Other Items", "questions": [req(condition)]},
        ],
    },
    {
        "slug": "pg-roommate",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            pick("room_type", "Room Type", ["Single", "Sharing", "1RK", "1BHK"]),
            pg_gender, deposit,
            pick_many("amenities", "Amenities", PG_AMENITIES),
        ],
        "subcategories": [
            {"slug": "pg-hostels", "name": "PG & Hostels", "price_label": "Monthly Rent per bed (₹)", "questions": [
                req(pg_gender),
                req(pick("sharing", "Sharing", ["Single", "2 Sharing", "3 Sharing", "4+ Sharing"])),
                req(pick("food_included", "Food", ["No food", "Breakfast only", "2 meals", "3 meals"])),
                yes_no("electricity_included", "Electricity included in rent"),
                # Food is its own question here, so it isn't repeated as an amenity
                pick_many("amenities", "Amenities", [a for a in PG_AMENITIES if a != "Food"]),
                deposit,
            ]},
            {"slug": "flatmates", "name": "Flatmates & Roommates", "price_label": "Monthly Rent (your share) (₹)", "questions": [
                req(pick("room_type", "Room", ["Private room", "Shared room"])),
                req(pg_gender),
                pick("flat_size", "Flat size", ["1 BHK", "2 BHK", "3 BHK", "4+ BHK"]),
                pick("available_from", "Available from", ["Immediately", "Within 15 days", "Within a month", "Later"]),
                pick("food_preference", "Food preference", ["Veg only", "Any"]),
                deposit,
            ]},
        ],
    },
    {
        "slug": "jobs",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            company, salary_min, salary_max, job_type,
            q("experience_required", "Experience Required", placeholder="e.g. 1-2 years"),
            pick("work_mode", "Work Mode", ["On-site", "Remote", "Hybrid"]),
        ],
        "subcategories": [
            job_sub("sales-marketing-jobs", "Sales & Marketing",
                    yes_no("incentives", "Incentives on top of salary"),
                    placeholder="e.g. Field Sales Executive"),
            job_sub("delivery-driver-jobs", "Delivery & Drivers",
                    req(pick("licence_type", "Licence needed", ["Two-wheeler", "Car (LMV)", "Heavy vehicle (HMV)", "None"])),
                    yes_no("vehicle_provided", "Vehicle provided"),
                    placeholder="e.g. Delivery Partner, Car Driver"),
            job_sub("office-admin-jobs", "Office & Admin",
                    pick("qualification", "Minimum Qualification", ["Any", "10th", "12th", "Diploma / ITI", "Graduate", "Post-graduate"]),
                    placeholder="e.g. Receptionist, Data Entry Operator"),
            job_sub("it-software-jobs", "IT & Software",
                    pick("work_mode", "Work Mode", ["On-site", "Remote", "Hybrid"]),
                    placeholder="e.g. Junior Python Developer"),
            job_sub("teaching-jobs", "Teaching",
                    req(pick_many("subjects", "Subjects", SUBJECTS)),
                    pick_many("class_level", "Classes", ["Pre-school", "Class 1-5", "Class 6-10", "Class 11-12", "Degree"]),
                    placeholder="e.g. Maths Teacher for Class 8-10"),
            job_sub("healthcare-jobs", "Healthcare",
                    req(pick("role", "Role", ["Nurse", "Pharmacist", "Lab Technician", "Receptionist", "Doctor", "Other"])),
                    placeholder="e.g. Staff Nurse, Pharmacist"),
            job_sub("retail-hospitality-jobs", "Shops, Hotels & Restaurants",
                    pick("shift", "Shift", ["Day", "Night", "Rotational"]),
                    yes_no("food_accommodation", "Food / stay provided"),
                    placeholder="e.g. Store Helper, Cook, Waiter"),
            job_sub("skilled-trade-jobs", "Electrician, Plumber & Technician",
                    req(pick("trade", "Trade", ["Electrician", "Plumber", "Carpenter", "AC Technician", "Welder", "Mechanic", "Other"])),
                    placeholder="e.g. AC Technician"),
            # A household hiring help isn't asked for a company name
            {"slug": "domestic-help-jobs", "name": "Maids, Cooks & Nannies",
             "title_placeholder": "e.g. Cook needed for family of 4", "questions": [
                req(pick_many("duties", "Work", ["Cooking", "Cleaning", "Baby care", "Elderly care", "Driving"])),
                req(pick("work_shift", "When", ["Morning", "Evening", "Morning & evening", "Full day"])),
                yes_no("live_in", "Live-in"),
                salary_min, salary_max, experience_level,
            ]},
        ],
    },
    {
        "slug": "vehicles",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            q("brand", "Brand", placeholder="e.g. Honda, Maruti Suzuki"),
            q("model", "Model", placeholder="e.g. Activa 6G, Swift"),
            year, km_driven,
            pick("fuel_type", "Fuel Type", ["Petrol", "Diesel", "Electric", "CNG", "Hybrid"]),
            pick("transmission", "Transmission", ["Manual", "Automatic"]),
            q("owners_count", "Number of Owners", "number", min_=1, max_=10, filter_=True),
        ],
        "subcategories": [
            {"slug": "cars", "name": "Cars", "title_placeholder": "e.g. Maruti Swift VXI 2019, single owner", "questions": [
                req(pick("brand", "Brand", CAR_BRANDS)),
                req(q("model", "Model", placeholder="e.g. Swift VXI, Creta SX")),
                req(year), req(km_driven),
                req(pick("fuel_type", "Fuel", ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"])),
                req(pick("transmission", "Transmission", ["Manual", "Automatic"])),
                owner,
            ]},
            {"slug": "bikes-scooters", "name": "Bikes & Scooters", "title_placeholder": "e.g. Honda Activa 6G 2022", "questions": [
                req(pick("brand", "Brand", BIKE_BRANDS)),
                req(q("model", "Model", placeholder="e.g. Activa 6G, Classic 350")),
                req(year), req(km_driven),
                req(pick("fuel_type", "Fuel", ["Petrol", "Electric"])),
                owner,
            ]},
            {"slug": "bicycles", "name": "Bicycles", "questions": [
                req(pick("bicycle_type", "Type", ["Kids", "Regular", "Gear cycle", "Electric cycle"])),
                req(condition), item_age,
            ]},
            {"slug": "commercial-vehicles", "name": "Autos & Commercial", "title_placeholder": "e.g. Bajaj RE Auto 2020, own permit", "questions": [
                req(pick("vehicle_kind", "Vehicle", ["Auto rickshaw", "Mini truck / Tempo", "Truck", "Tractor", "Van / Bus"])),
                req(year), km_driven,
                pick("fuel_type", "Fuel", ["Diesel", "Petrol", "CNG", "LPG", "Electric"]),
                pick("permit", "Permit", ["All-India", "State", "City", "None"]),
            ]},
            {"slug": "garages-car-wash", "name": "Garages, Service & Car Wash", "price_label": "Starting Price (₹)",
             "title_placeholder": "e.g. Multi-brand Car Service & Denting", "questions": [
                req(pick_many("vehicles_serviced", "Vehicles", ["Car", "Bike / Scooter", "Commercial"])),
                req(pick_many("garage_services", "Services", [
                    "General service", "Repairs", "Denting & painting", "Car wash & detailing", "Tyres & battery", "AC repair"])),
                yes_no("pickup_drop", "Free pickup & drop"),
            ]},
            {"slug": "spare-parts", "name": "Spare Parts & Accessories", "questions": [
                req(pick("part_type", "Type", [
                    "Tyres & wheels", "Battery", "Helmet & riding gear", "Car accessories", "Engine & body parts", "Other"])),
                req(condition),
            ]},
        ],
    },
    {
        "slug": "electronics",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            q("brand", "Brand", placeholder="e.g. Samsung, Apple"),
            q("model", "Model", placeholder="e.g. Galaxy S23"),
            condition,
            q("warranty_remaining", "Warranty Remaining", placeholder="e.g. 6 months"),
        ],
        "subcategories": [
            {"slug": "mobiles-tablets", "name": "Mobiles & Tablets", "title_placeholder": "e.g. iPhone 13, 128GB, Blue", "questions": [
                req(pick("brand", "Brand", PHONE_BRANDS)),
                req(q("model", "Model", placeholder="e.g. iPhone 13, Galaxy S23")),
                pick("storage", "Storage", ["32GB", "64GB", "128GB", "256GB", "512GB+"]),
                req(condition), item_age, bill,
            ]},
            {"slug": "laptops-computers", "name": "Laptops & Computers", "title_placeholder": "e.g. Dell Inspiron i5, 8GB, 512GB SSD", "questions": [
                req(pick("device_type", "Type", ["Laptop", "Desktop", "Monitor", "Printer", "Accessory"])),
                req(pick("brand", "Brand", LAPTOP_BRANDS)),
                pick("processor", "Processor", ["Intel i3", "Intel i5", "Intel i7 / i9", "AMD Ryzen", "Apple M-series", "Other"]),
                pick("ram", "RAM", ["4GB", "8GB", "16GB", "32GB+"]),
                req(condition), item_age,
            ]},
            {"slug": "tv-audio", "name": "TV & Audio", "questions": [
                req(pick("device_type", "Type", ["TV", "Speaker / Soundbar", "Headphones", "Home theatre"])),
                req(pick("brand", "Brand", TV_BRANDS)),
                pick("screen_size", "Screen size (TV)", ['Under 32"', '32"', '40-43"', '50-55"', '65" and above']),
                yes_no("smart_tv", "Smart TV"),
                req(condition), item_age,
            ]},
            {"slug": "home-appliances", "name": "Home Appliances", "title_placeholder": "e.g. LG 7kg Front Load Washing Machine", "questions": [
                req(pick("appliance_type", "Appliance", [
                    "Fridge", "Washing Machine", "AC", "Cooler", "Microwave / Oven", "Water Purifier",
                    "Geyser", "Mixer / Grinder", "Other"])),
                req(pick("brand", "Brand", APPLIANCE_BRANDS)),
                req(condition), item_age, under_warranty,
            ]},
            {"slug": "cameras", "name": "Cameras", "questions": [
                req(pick("brand", "Brand", CAMERA_BRANDS)),
                req(condition), item_age, bill,
            ]},
            {"slug": "gaming-accessories", "name": "Gaming & Accessories", "questions": [
                req(pick("gadget_type", "Type", ["Gaming console", "Smartwatch", "Earphones", "Power bank", "Other"])),
                req(condition), item_age,
            ]},
        ],
    },
    {
        "slug": "services",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            q("service_type", "Service Type", placeholder="e.g. Plumber, Electrician"),
            q("experience_years", "Experience (years)", "number", min_=0, max_=60, filter_=True),
        ],
        "subcategories": [
            service_sub("electricians", "Electricians",
                        req(pick_many("work_types", "Work", [
                            "Wiring", "Repairs & fittings", "Fans & lights", "Inverter / UPS", "Motor & pump", "CCTV"])),
                        emergency, experience, placeholder="e.g. Home Electrician — wiring & repairs"),
            service_sub("plumbers", "Plumbers",
                        req(pick_many("work_types", "Work", [
                            "Leak repair", "Taps & bathroom fittings", "Motor & pump", "Water tank", "Drainage / blockage"])),
                        emergency, experience, placeholder="e.g. Plumber — leaks, taps, motor fitting"),
            service_sub("carpenters", "Carpenters",
                        req(pick_many("work_types", "Work", ["Repairs", "New furniture", "Modular kitchen", "Doors & windows"])),
                        experience, placeholder="e.g. Carpenter — furniture repair & modular work"),
            service_sub("painters", "Painting & Renovation",
                        req(pick_many("work_types", "Work", [
                            "Interior painting", "Exterior painting", "Waterproofing", "Tiling", "Full renovation"])),
                        experience, placeholder="e.g. House Painting — interior & exterior"),
            service_sub("appliance-repair", "AC & Appliance Repair",
                        req(pick_many("appliances", "Appliances you repair", [
                            "AC", "Fridge", "Washing Machine", "TV", "Microwave", "RO / Water Purifier", "Geyser"])),
                        emergency, experience, placeholder="e.g. AC Service & Gas Refill"),
            service_sub("beauty-salon", "Beauty & Salon",
                        req(pick("for_whom", "For", ["Women", "Men", "Unisex"])),
                        pick_many("beauty_services", "Services", [
                            "Haircut & styling", "Facial & cleanup", "Bridal makeup", "Mehendi", "Waxing & threading", "Nails"]),
                        yes_no("home_service", "Home service available"),
                        placeholder="e.g. Unisex Salon & Bridal Makeup"),
            service_sub("cleaning-pest-control", "Cleaning & Pest Control",
                        req(pick_many("cleaning_services", "Services", [
                            "Full home deep cleaning", "Kitchen & bathroom", "Sofa & carpet", "Water tank",
                            "Pest control", "Termite treatment"])),
                        experience, placeholder="e.g. Home Deep Cleaning & Pest Control"),
            service_sub("packers-movers", "Packers & Movers",
                        req(pick_many("move_types", "Moves", ["Within city", "Intercity", "Bike / car transport", "Office shifting"])),
                        yes_no("insurance_available", "Transit insurance"),
                        placeholder="e.g. Packers & Movers — local & intercity"),
            service_sub("laundry", "Laundry & Dry Cleaning",
                        req(pick_many("laundry_services", "Services", ["Wash & fold", "Ironing", "Dry cleaning", "Shoe cleaning"])),
                        yes_no("pickup_delivery", "Free pickup & delivery"),
                        placeholder="e.g. Laundry with free pickup", price_label="Starting Price (₹ per kg / piece)"),
            service_sub("pet-care", "Pet Care",
                        req(pick_many("pet_services", "Services", ["Vet doctor", "Grooming", "Boarding", "Training", "Pet food & supplies"])),
                        yes_no("home_visit", "Home visit"),
                        placeholder="e.g. Pet Grooming at Home"),
            service_sub("taxi-travel", "Taxi & Travel",
                        req(pick_many("vehicles_offered", "Vehicles", ["Car", "Auto", "Tempo Traveller", "Bus"])),
                        pick_many("trip_types", "Trips", ["Local", "Outstation", "Airport", "Tour packages"]),
                        placeholder="e.g. Outstation Cabs & Airport Drop", price_label="Starting Fare (₹)"),
            service_sub("gym-fitness", "Gym, Yoga & Fitness",
                        req(pick_many("fitness_types", "Offers", [
                            "Gym", "Yoga", "Zumba / Aerobics", "Personal trainer", "Martial arts", "Swimming"])),
                        pick("for_whom", "For", ["Women", "Men", "Unisex"]),
                        yes_no("free_trial", "Free trial class"),
                        placeholder="e.g. Ladies Gym & Yoga Studio", price_label="Monthly Fee (₹)"),
            service_sub("tailoring", "Tailoring & Alterations",
                        req(pick_many("tailoring_for", "For", ["Women", "Men", "Kids"])),
                        pick_many("tailoring_services", "Services", [
                            "Stitching", "Alterations", "Blouse designing", "Embroidery / Maggam work", "Uniforms"]),
                        placeholder="e.g. Ladies Tailor — Blouses & Maggam Work"),
            service_sub("professionals", "CA, Lawyers & Consultants",
                        req(pick("profession", "Profession", [
                            "Chartered Accountant", "Lawyer", "Tax / GST Consultant", "Insurance Agent", "Loan Agent", "Other"])),
                        experience,
                        placeholder="e.g. GST Filing & Income Tax Returns", price_label="Consultation Fee (₹)"),
            service_sub("other-services", "Other Services",
                        req(q("service_type", "What service", placeholder="e.g. Tent house, Interior design")),
                        experience),
        ],
    },
    {
        "slug": "tiffin",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            meal_type,
            q("delivery_area", "Delivery Area", placeholder="e.g. Within 5km of Kukatpally"),
            yes_no("subscription_available", "Subscription Available"),
        ],
        "subcategories": [
            {"slug": "tiffin-mess", "name": "Tiffin & Mess", "price_label": "Monthly plan price (₹)", "questions": [
                req(meal_type),
                req(pick_many("meals", "Meals", ["Breakfast", "Lunch", "Dinner"])),
                cuisine, home_delivery,
                yes_no("subscription_available", "Monthly subscription"),
            ]},
            {"slug": "home-chefs", "name": "Home Chefs & Homemade Food", "price_label": "Starting Price (₹)", "questions": [
                req(meal_type),
                req(pick_many("food_items", "What you make", [
                    "Meals", "Snacks", "Sweets", "Pickles & podis", "Biryani", "Cakes & bakes"])),
                pick("order_notice", "Order in advance", ["Same day", "1 day before", "2+ days before"]),
                home_delivery,
            ]},
            {"slug": "restaurants", "name": "Restaurants", "price_label": "Average cost for two (₹)", "questions": [
                req(meal_type), cuisine,
                req(pick_many("service_options", "Available", ["Dine-in", "Takeaway", "Home delivery"])),
            ]},
            {"slug": "bakeries-sweets", "name": "Bakeries, Sweets & Cafes", "price_label": "Starting Price (₹)", "questions": [
                req(pick_many("items_sold", "Sells", ["Cakes", "Sweets", "Snacks", "Coffee & Tea", "Custom cakes"])),
                yes_no("eggless", "Eggless options"), home_delivery,
            ]},
            {"slug": "caterers", "name": "Caterers", "price_label": "Price per plate (₹)", "questions": [
                req(meal_type),
                req(pick_many("event_types", "Events", ["Weddings", "Birthdays", "Pooja / functions", "Corporate"])),
                pick("guest_range", "Guests", ["Under 50", "50-200", "200-500", "500+"]),
                cuisine,
            ]},
        ],
    },
    {
        "slug": "real-estate",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            pick("property_type", "Property Type", ["Apartment", "Independent House", "Villa", "Plot", "Commercial"]),
            bhk, sqft, furnishing,
            pick("listing_type", "Listing Type", ["Rent", "Sale"]),
        ],
        "subcategories": [
            {"slug": "homes-for-rent", "name": "Houses & Flats for Rent", "price_label": "Monthly Rent (₹)",
             "title_placeholder": "e.g. 2BHK Semi-furnished Flat near Metro", "questions": [
                req(pick("property_type", "Property Type", ["Apartment", "Independent House", "Villa"])),
                req(bhk), req(furnishing), sqft, deposit,
                pick("tenant_preference", "Preferred tenants", ["Family", "Bachelors", "Any"]),
                req(posted_by),
            ]},
            {"slug": "homes-for-sale", "name": "Houses & Flats for Sale", "price_label": "Total Price (₹)",
             "title_placeholder": "e.g. 3BHK East-facing Flat, Ready to Move", "questions": [
                req(pick("property_type", "Property Type", ["Apartment", "Independent House", "Villa"])),
                req(bhk), req(sqft),
                req(pick("construction_status", "Status", ["Ready to move", "Under construction"])),
                facing, req(posted_by),
            ]},
            {"slug": "plots-land", "name": "Plots & Land", "price_label": "Total Price (₹)",
             "title_placeholder": "e.g. 200 sq.yd DTCP-approved Plot", "questions": [
                req(q("plot_area", "Plot area", "number", min_=1, max_=10_000_000, placeholder="e.g. 200")),
                req(pick("area_unit", "Area unit", ["sq.yd", "sq.ft", "acres", "guntas", "cents"])),
                pick("approval", "Approval", ["DTCP", "HMDA", "BDA / BMRDA", "Panchayat", "Other / None"]),
                facing, req(posted_by),
            ]},
            {"slug": "commercial-property", "name": "Shops & Offices", "price_label": "Rent / Price (₹)", "questions": [
                req(pick("listing_type", "For", ["Rent", "Sale"])),
                req(pick("commercial_type", "Type", ["Shop", "Office", "Warehouse / Godown", "Showroom"])),
                req(sqft), furnishing, req(posted_by),
            ]},
        ],
    },
    {
        "slug": "furniture",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            q("material", "Material", placeholder="e.g. Wood, Metal"),
            q("dimensions", "Dimensions", placeholder="e.g. 6ft x 4ft"),
            condition,
        ],
        "subcategories": [
            {"slug": "sofas-seating", "name": "Sofas & Seating", "questions": [
                pick("sofa_size", "Size", ["Single seater", "2 seater", "3 seater", "L-shape", "Sofa set"]),
                material, req(condition), item_age]},
            {"slug": "beds-mattresses", "name": "Beds & Mattresses", "questions": [
                req(pick("bed_size", "Size", ["Single", "Double", "Queen", "King"])),
                yes_no("with_mattress", "Mattress included"), material, req(condition), item_age]},
            {"slug": "tables-chairs", "name": "Dining, Tables & Chairs", "questions": [
                pick("table_type", "Type", ["Dining set", "Study table", "Coffee table", "Chairs only", "Other"]),
                material, req(condition), item_age]},
            {"slug": "wardrobes-storage", "name": "Wardrobes & Storage", "questions": [
                pick("doors", "Doors", ["1 door", "2 doors", "3 doors", "4+ doors"]),
                material, req(condition), item_age]},
            {"slug": "office-furniture", "name": "Office Furniture", "questions": [
                pick("office_item", "Type", ["Office chair", "Desk / Workstation", "Cabinet", "Other"]),
                req(condition), item_age]},
            {"slug": "home-decor", "name": "Home Decor", "questions": [
                pick("decor_type", "Type", ["Curtains & blinds", "Lighting", "Wall decor", "Carpets & rugs", "Plants & pots", "Other"]),
                req(condition)]},
        ],
    },
    {
        "slug": "fashion",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            q("brand", "Brand", placeholder="e.g. Nike, Zara"),
            q("size", "Size", placeholder="e.g. M, 32, UK 8"),
            gender_fashion,
        ],
        "subcategories": [
            {"slug": "clothing", "name": "Clothing", "questions": [
                req(gender_fashion),
                req(pick("size", "Size", ["XS", "S", "M", "L", "XL", "XXL+", "Free size"])),
                req(fashion_condition)]},
            {"slug": "ethnic-wear", "name": "Sarees & Ethnic Wear", "questions": [
                req(gender_fashion),
                pick("fabric", "Fabric", ["Silk / Pattu", "Cotton", "Georgette / Chiffon", "Synthetic", "Other"]),
                pick("occasion", "Occasion", ["Wedding", "Festive", "Daily wear", "Party"]),
                req(fashion_condition)]},
            {"slug": "footwear", "name": "Footwear", "questions": [
                req(gender_fashion),
                req(pick("size", "Size", ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11+"])),
                req(fashion_condition)]},
            {"slug": "watches-jewellery", "name": "Watches & Jewellery", "questions": [
                req(gender_fashion),
                pick("jewellery_material", "Material", ["Gold", "Silver", "Imitation / Fashion", "Steel", "Other"]),
                req(fashion_condition)]},
            {"slug": "bags-accessories", "name": "Bags & Accessories", "questions": [
                pick("bag_type", "Type", ["Handbag", "Backpack", "Wallet", "Belt", "Sunglasses", "Other"]),
                req(fashion_condition)]},
        ],
    },
    {
        "slug": "education",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            q("course_type", "Course Type", placeholder="e.g. Spoken English, Maths Tuition"),
            online_offline,
            q("duration", "Duration", placeholder="e.g. 3 months"),
        ],
        "subcategories": [
            {"slug": "tuition-tutors", "name": "Tuition & Home Tutors", "price_label": "Monthly Fee (₹)",
             "title_placeholder": "e.g. Maths & Science Tuition for Class 8-10", "questions": [
                req(pick_many("subjects", "Subjects", SUBJECTS)),
                req(pick_many("class_level", "Classes", ["Class 1-5", "Class 6-8", "Class 9-10", "Class 11-12", "Degree"])),
                pick_many("board", "Board", ["CBSE", "ICSE", "State board", "IB / IGCSE"]),
                req(pick("mode", "Where", ["Home tuition", "At my centre", "Online"])),
                batch_when,
            ]},
            {"slug": "coaching-exams", "name": "Coaching & Competitive Exams", "price_label": "Course Fee (₹)",
             "title_placeholder": "e.g. NEET Long-term Coaching", "questions": [
                req(pick_many("exam", "Exams", ["JEE", "NEET", "EAMCET / EAPCET", "UPSC", "Group exams (APPSC / TSPSC)",
                                                 "Bank / SSC", "Other"])),
                req(online_offline), batch_when,
                yes_no("study_material", "Study material included"),
            ]},
            {"slug": "language-classes", "name": "Spoken English & Languages", "price_label": "Course Fee (₹)", "questions": [
                req(pick("language", "Language", ["English", "Hindi", "Telugu", "Tamil", "Kannada", "German", "French", "Other"])),
                pick("level", "Level", ["Beginner", "Intermediate", "Advanced"]),
                req(online_offline),
            ]},
            {"slug": "music-dance-arts", "name": "Music, Dance & Arts", "price_label": "Monthly Fee (₹)", "questions": [
                req(pick("activity", "Activity", ["Vocal music", "Instrument", "Classical dance", "Western dance",
                                                  "Drawing & painting", "Other"])),
                pick("age_group", "Age group", ["Kids", "Teens", "Adults", "All ages"]),
                req(online_offline),
            ]},
            {"slug": "computer-skill-courses", "name": "Computer & Skill Courses", "price_label": "Course Fee (₹)", "questions": [
                req(pick("course", "Course", ["Tally / Accounting", "MS Office", "Programming", "Digital marketing",
                                              "Tailoring", "Beautician", "Other"])),
                req(online_offline),
                yes_no("certificate", "Certificate given"),
            ]},
            {"slug": "schools-colleges", "name": "Schools & Colleges", "price_label": "Annual Fee (₹)", "questions": [
                req(pick("institution_type", "Type", [
                    "Pre-school / Play school", "School", "Junior college", "Degree college", "Other"])),
                pick("board_affiliation", "Board", ["CBSE", "ICSE", "State board", "IB / IGCSE", "University"]),
                yes_no("admissions_open", "Admissions open"),
                yes_no("transport", "School / college bus"),
            ]},
            {"slug": "driving-schools", "name": "Driving Schools", "price_label": "Course Fee (₹)", "questions": [
                req(pick_many("vehicles_taught", "Learn to drive", ["Two-wheeler", "Car"])),
                yes_no("licence_help", "Helps with licence (RTO)"),
            ]},
        ],
    },
    {
        "slug": "doctors",
        # Legacy list — the installed app sends these keys; keep them working.
        "questions": [
            q("specialization", "Specialization", placeholder="e.g. Dentist, Cardiologist"),
            fee,
            q("available_timings", "Available Timings", placeholder="e.g. Mon-Sat 10am-6pm"),
        ],
        "subcategories": [
            {"slug": "doctors-clinics", "name": "Doctors & Clinics", "show_price": False,
             "title_placeholder": "e.g. Dr. Rao's Child Clinic", "questions": [
                req(pick("specialization", "Specialization", [
                    "General Physician", "Paediatrician", "Gynaecologist", "Orthopaedic", "Dermatologist",
                    "ENT", "Cardiologist", "Physiotherapist", "Ayurveda", "Homeopathy", "Other"])),
                experience, fee, req(available_when),
                yes_no("home_visit", "Home visit"),
            ]},
            {"slug": "hospitals", "name": "Hospitals", "show_price": False, "questions": [
                req(pick("hospital_type", "Type", [
                    "Multi-speciality", "Maternity", "Children's", "Eye", "Orthopaedic", "Nursing home", "Other"])),
                yes_no("emergency_24x7", "24x7 emergency"),
                yes_no("insurance_accepted", "Cashless / insurance accepted"),
            ]},
            {"slug": "dentists", "name": "Dentists", "show_price": False, "questions": [
                pick_many("dental_services", "Treatments", ["Cleaning", "Root canal", "Braces", "Implants", "Kids dentistry"]),
                experience, fee, req(available_when),
            ]},
            {"slug": "eye-care", "name": "Eye Care & Opticals", "show_price": False, "questions": [
                req(pick("eye_care_type", "Type", ["Eye clinic / hospital", "Optical shop"])),
                yes_no("eye_test", "Free eye test"),
            ]},
            {"slug": "diagnostics-labs", "name": "Diagnostics & Labs", "show_price": False, "questions": [
                req(pick_many("tests", "Tests", ["Blood tests", "X-ray", "Ultrasound / Scan", "MRI / CT", "ECG"])),
                yes_no("home_sample_collection", "Home sample collection"),
            ]},
            {"slug": "pharmacies", "name": "Pharmacies & Medical Shops", "show_price": False, "questions": [
                yes_no("open_24x7", "Open 24x7"), home_delivery,
            ]},
        ],
    },
    {
        # Event *posts* use the Events Calendar form (venue/date/ticket), not
        # these questions; the subcategories sort the Business Directory.
        "slug": "events",
        "questions": [],
        "subcategories": [
            {"slug": "function-halls", "name": "Function & Banquet Halls", "questions": []},
            {"slug": "decorators", "name": "Decorators & Tent House", "questions": []},
            {"slug": "photographers", "name": "Photographers & Videographers", "questions": []},
            {"slug": "makeup-mehendi", "name": "Bridal Makeup & Mehendi", "questions": []},
            {"slug": "event-organisers", "name": "Event Organisers & DJs", "questions": []},
            {"slug": "pandits-pooja", "name": "Pandits & Pooja Services", "questions": []},
        ],
    },
    {
        # Business posts use the Business Directory form; the subcategories
        # sort the directory's generic "Shops & Stores" bucket.
        "slug": "businesses",
        "questions": [],
        "subcategories": [
            {"slug": "kirana-supermarkets", "name": "Kirana & Supermarkets", "questions": []},
            {"slug": "hardware-paints", "name": "Hardware, Paints & Electricals", "questions": []},
            {"slug": "stationery-books-shops", "name": "Stationery & Book Shops", "questions": []},
            {"slug": "gifts-toys", "name": "Gifts & Toys", "questions": []},
            {"slug": "pooja-items", "name": "Pooja Items", "questions": []},
            {"slug": "other-shops", "name": "Other Shops", "questions": []},
        ],
    },
]

_BY_SLUG = {c["slug"]: c for c in CATALOG}
_SUB_BY_SLUG = {s["slug"]: (c["slug"], s) for c in CATALOG for s in c["subcategories"]}


def category_entry(slug: str | None) -> dict | None:
    return _BY_SLUG.get(slug or "")


def subcategory_entry(slug: str | None) -> tuple[str, dict] | None:
    """(parent category slug, subcategory entry) for a subcategory slug."""
    return _SUB_BY_SLUG.get(slug or "")


def questions_for(category_slug: str | None, subcategory_slug: str | None = None) -> list[dict]:
    sub = subcategory_entry(subcategory_slug)
    if sub and sub[0] == category_slug:
        return sub[1]["questions"]
    cat = category_entry(category_slug)
    return cat["questions"] if cat else []


def filterable_questions(category_slug: str | None, subcategory_slug: str | None = None) -> dict[str, dict]:
    """Every filterable question for a category (all its subcategories too, so
    a category-wide search can still filter on e.g. fuel_type), by key."""
    out: dict[str, dict] = {}
    cat = category_entry(category_slug)
    if not cat:
        return out
    lists = [questions_for(category_slug, subcategory_slug)] if subcategory_slug else \
        [cat["questions"]] + [s["questions"] for s in cat["subcategories"]]
    for qs in lists:
        for qq in qs:
            if qq.get("filter") and qq["key"] not in out:
                out[qq["key"]] = qq
    return out


class AnswerError(ValueError):
    pass


def validate_answers(category_slug: str | None, subcategory_slug: str | None, answers: dict | None) -> dict:
    """Check posted answers against the question list; returns the cleaned dict
    (blank answers dropped, numbers as int/float). Raises AnswerError."""
    questions = questions_for(category_slug, subcategory_slug)
    by_key = {qq["key"]: qq for qq in questions}
    answers = answers or {}
    unknown = [k for k in answers if k not in by_key]
    if unknown:
        raise AnswerError(f"Unknown question(s) for this category: {', '.join(sorted(unknown))}")

    clean: dict = {}
    for key, qq in by_key.items():
        v = answers.get(key)
        if v is None or v == "" or v == []:
            if qq.get("required"):
                raise AnswerError(f"'{qq['label']}' is required.")
            continue
        t = qq["type"]
        if t == "number":
            if isinstance(v, bool):
                raise AnswerError(f"'{qq['label']}' must be a number.")
            try:
                num = float(v)
            except (TypeError, ValueError):
                raise AnswerError(f"'{qq['label']}' must be a number.")
            if "min" in qq and num < qq["min"] or "max" in qq and num > qq["max"]:
                raise AnswerError(f"'{qq['label']}' must be between {qq.get('min')} and {qq.get('max')}.")
            v = int(num) if num.is_integer() else num
        elif t == "switch":
            if not isinstance(v, bool):
                raise AnswerError(f"'{qq['label']}' must be yes or no.")
        elif t == "select":
            if v not in qq["options"]:
                raise AnswerError(f"'{qq['label']}' must be one of: {', '.join(qq['options'])}.")
        elif t == "multiselect":
            if not isinstance(v, list) or any(x not in qq["options"] for x in v):
                raise AnswerError(f"'{qq['label']}' must be chosen from: {', '.join(qq['options'])}.")
            v = list(dict.fromkeys(v))
        else:
            v = str(v).strip()
            if len(v) > 150:
                raise AnswerError(f"'{qq['label']}' is too long (max 150 characters).")
            if not v:
                if qq.get("required"):
                    raise AnswerError(f"'{qq['label']}' is required.")
                continue
        clean[key] = v

    if "salary_min" in clean and "salary_max" in clean and clean["salary_min"] > clean["salary_max"]:
        raise AnswerError("Min Salary can't be more than Max Salary.")
    return clean


def display_rows(category_slug: str | None, subcategory_slug: str | None, answers: dict | None) -> list[dict]:
    """Answers as [{label, value}] in question order, ready to show buyers.
    Falls back to the category's questions and then every subcategory's, so
    answers saved under an older question list still get a label."""
    if not answers:
        return []
    labels: dict[str, dict] = {}
    cat = category_entry(category_slug)
    lists = [questions_for(category_slug, subcategory_slug)]
    if cat:
        lists += [cat["questions"]] + [s["questions"] for s in cat["subcategories"]]
    for qs in lists:
        for qq in qs:
            labels.setdefault(qq["key"], qq)

    rows = []
    for key, qq in labels.items():
        if key not in answers:
            continue
        v = answers[key]
        if isinstance(v, float) and v.is_integer():
            v = int(v)  # Numeric columns copied from the old tables come back as 15000.0
        if qq["type"] == "switch":
            text = "Yes" if v else "No"
        elif qq["type"] == "multiselect" and isinstance(v, list):
            text = ", ".join(str(x) for x in v)
        elif qq["type"] == "number":
            unit = qq.get("unit")
            if unit and unit.startswith("₹"):
                text = f"₹{v:,}" + unit[1:].replace("/", " / ") if isinstance(v, (int, float)) else str(v)
            else:
                text = f"{v:,}" if isinstance(v, (int, float)) and key not in ("year",) else str(v)
                if unit:
                    text += f" {unit}"
        else:
            text = str(v)
        rows.append({"key": key, "label": qq["label"], "value": text})
    return rows


def public_catalog(names: dict[str, tuple[str, str | None]]) -> list[dict]:
    """The catalog for clients. `names` maps top-level slug → (name, icon),
    in display order, from the categories table — still the source of the
    top-level names, icons and order."""
    out = []
    for slug, (name, icon) in names.items():
        c = _BY_SLUG.get(slug)
        out.append({
            "slug": slug, "name": name, "icon": icon,
            "questions": c["questions"] if c else [],
            "subcategories": c["subcategories"] if c else [],
        })
    return out
