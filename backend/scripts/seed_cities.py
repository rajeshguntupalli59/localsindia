"""Seed 140 South India-focused cities into the database. Idempotent."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.dialects.postgresql import insert
from app.core.config import settings
from app.models.city import City

CITIES = [
    # National Metro
    ("Hyderabad",           "Telangana",       "hyderabad",          "te"),
    ("Bengaluru",           "Karnataka",       "bengaluru",          "kn"),
    ("Chennai",             "Tamil Nadu",      "chennai",            "ta"),
    ("Mumbai",              "Maharashtra",     "mumbai",             "mr"),
    ("Delhi",               "Delhi",           "delhi",              "hi"),
    ("Pune",                "Maharashtra",     "pune",               "mr"),
    ("Kolkata",             "West Bengal",     "kolkata",            "bn"),
    ("Ahmedabad",           "Gujarat",         "ahmedabad",          "gu"),
    ("Jaipur",              "Rajasthan",       "jaipur",             "hi"),
    ("Lucknow",             "Uttar Pradesh",   "lucknow",            "hi"),
    # Andhra Pradesh
    ("Visakhapatnam",       "Andhra Pradesh",  "visakhapatnam",      "te"),
    ("Vijayawada",          "Andhra Pradesh",  "vijayawada",         "te"),
    ("Guntur",              "Andhra Pradesh",  "guntur",             "te"),
    ("Nellore",             "Andhra Pradesh",  "nellore",            "te"),
    ("Kurnool",             "Andhra Pradesh",  "kurnool",            "te"),
    ("Kakinada",            "Andhra Pradesh",  "kakinada",           "te"),
    ("Rajamahendravaram",   "Andhra Pradesh",  "rajamahendravaram",  "te"),
    ("Kadapa",              "Andhra Pradesh",  "kadapa",             "te"),
    ("Tirupati",            "Andhra Pradesh",  "tirupati",           "te"),
    ("Anantapuram",         "Andhra Pradesh",  "anantapuram",        "te"),
    ("Ongole",              "Andhra Pradesh",  "ongole",             "te"),
    ("Vizianagaram",        "Andhra Pradesh",  "vizianagaram",       "te"),
    ("Eluru",               "Andhra Pradesh",  "eluru",              "te"),
    ("Proddatur",           "Andhra Pradesh",  "proddatur",          "te"),
    ("Nandyal",             "Andhra Pradesh",  "nandyal",            "te"),
    ("Adoni",               "Andhra Pradesh",  "adoni",              "te"),
    ("Machilipatnam",       "Andhra Pradesh",  "machilipatnam",      "te"),
    ("Tenali",              "Andhra Pradesh",  "tenali",             "te"),
    ("Chittoor",            "Andhra Pradesh",  "chittoor",           "te"),
    ("Hindupur",            "Andhra Pradesh",  "hindupur",           "te"),
    ("Srikakulam",          "Andhra Pradesh",  "srikakulam",         "te"),
    ("Bhimavaram",          "Andhra Pradesh",  "bhimavaram",         "te"),
    ("Tadepalligudem",      "Andhra Pradesh",  "tadepalligudem",     "te"),
    ("Guntakal",            "Andhra Pradesh",  "guntakal",           "te"),
    ("Dharmavaram",         "Andhra Pradesh",  "dharmavaram",        "te"),
    ("Gudivada",            "Andhra Pradesh",  "gudivada",           "te"),
    ("Narasaraopet",        "Andhra Pradesh",  "narasaraopet",       "te"),
    ("Madanapalle",         "Andhra Pradesh",  "madanapalle",        "te"),
    ("Kadiri",              "Andhra Pradesh",  "kadiri",             "te"),
    ("Tadipatri",           "Andhra Pradesh",  "tadipatri",          "te"),
    ("Chilakaluripet",      "Andhra Pradesh",  "chilakaluripet",     "te"),
    ("Mangalagiri",         "Andhra Pradesh",  "mangalagiri",        "te"),
    # Telangana
    ("Warangal",            "Telangana",       "warangal",           "te"),
    ("Nizamabad",           "Telangana",       "nizamabad",          "te"),
    ("Karimnagar",          "Telangana",       "karimnagar",         "te"),
    ("Khammam",             "Telangana",       "khammam",            "te"),
    ("Ramagundam",          "Telangana",       "ramagundam",         "te"),
    ("Mahbubnagar",         "Telangana",       "mahbubnagar",        "te"),
    ("Nalgonda",            "Telangana",       "nalgonda",           "te"),
    ("Adilabad",            "Telangana",       "adilabad",           "te"),
    ("Suryapet",            "Telangana",       "suryapet",           "te"),
    ("Miryalaguda",         "Telangana",       "miryalaguda",        "te"),
    ("Siddipet",            "Telangana",       "siddipet",           "te"),
    ("Jagtial",             "Telangana",       "jagtial",            "te"),
    ("Mancherial",          "Telangana",       "mancherial",         "te"),
    ("Nirmal",              "Telangana",       "nirmal",             "te"),
    ("Sangareddy",          "Telangana",       "sangareddy",         "te"),
    ("Bhongir",             "Telangana",       "bhongir",            "te"),
    ("Kamareddy",           "Telangana",       "kamareddy",          "te"),
    ("Wanaparthy",          "Telangana",       "wanaparthy",         "te"),
    ("Nagarkurnool",        "Telangana",       "nagarkurnool",       "te"),
    ("Medak",               "Telangana",       "medak",              "te"),
    ("Vikarabad",           "Telangana",       "vikarabad",          "te"),
    ("Zahirabad",           "Telangana",       "zahirabad",          "te"),
    ("Shadnagar",           "Telangana",       "shadnagar",          "te"),
    ("Bodhan",              "Telangana",       "bodhan",             "te"),
    ("Tandur",              "Telangana",       "tandur",             "te"),
    # Karnataka
    ("Mysuru",              "Karnataka",       "mysuru",             "kn"),
    ("Hubballi",            "Karnataka",       "hubballi",           "kn"),
    ("Mangaluru",           "Karnataka",       "mangaluru",          "kn"),
    ("Belagavi",            "Karnataka",       "belagavi",           "kn"),
    ("Kalaburagi",          "Karnataka",       "kalaburagi",         "kn"),
    ("Davanagere",          "Karnataka",       "davanagere",         "kn"),
    ("Ballari",             "Karnataka",       "ballari",            "kn"),
    ("Vijayapura",          "Karnataka",       "vijayapura",         "kn"),
    ("Shivamogga",          "Karnataka",       "shivamogga",         "kn"),
    ("Tumakuru",            "Karnataka",       "tumakuru",           "kn"),
    ("Raichur",             "Karnataka",       "raichur",            "kn"),
    ("Bidar",               "Karnataka",       "bidar",              "kn"),
    ("Udupi",               "Karnataka",       "udupi",              "kn"),
    ("Hospet",              "Karnataka",       "hospet",             "kn"),
    ("Gadag",               "Karnataka",       "gadag",              "kn"),
    ("Hassan",              "Karnataka",       "hassan",             "kn"),
    ("Bhadravati",          "Karnataka",       "bhadravati",         "kn"),
    ("Chitradurga",         "Karnataka",       "chitradurga",        "kn"),
    ("Kolar",               "Karnataka",       "kolar",              "kn"),
    ("Mandya",              "Karnataka",       "mandya",             "kn"),
    ("Chikkamagaluru",      "Karnataka",       "chikkamagaluru",     "kn"),
    ("Gangavati",           "Karnataka",       "gangavati",          "kn"),
    ("Bagalkot",            "Karnataka",       "bagalkot",           "kn"),
    ("Ranebennuru",         "Karnataka",       "ranebennuru",        "kn"),
    ("Arsikere",            "Karnataka",       "arsikere",           "kn"),
    ("Robertsonpet",        "Karnataka",       "robertsonpet",       "kn"),
    ("Dharwad",             "Karnataka",       "dharwad",            "kn"),
    # Tamil Nadu
    ("Coimbatore",          "Tamil Nadu",      "coimbatore",         "ta"),
    ("Madurai",             "Tamil Nadu",      "madurai",            "ta"),
    ("Tiruchirappalli",     "Tamil Nadu",      "tiruchirappalli",    "ta"),
    ("Salem",               "Tamil Nadu",      "salem",              "ta"),
    ("Tirunelveli",         "Tamil Nadu",      "tirunelveli",        "ta"),
    ("Tiruppur",            "Tamil Nadu",      "tiruppur",           "ta"),
    ("Erode",               "Tamil Nadu",      "erode",              "ta"),
    ("Vellore",             "Tamil Nadu",      "vellore",            "ta"),
    ("Thoothukudi",         "Tamil Nadu",      "thoothukudi",        "ta"),
    ("Thanjavur",           "Tamil Nadu",      "thanjavur",          "ta"),
    ("Nagercoil",           "Tamil Nadu",      "nagercoil",          "ta"),
    ("Dindigul",            "Tamil Nadu",      "dindigul",           "ta"),
    ("Kanchipuram",         "Tamil Nadu",      "kanchipuram",        "ta"),
    ("Kumbakonam",          "Tamil Nadu",      "kumbakonam",         "ta"),
    ("Hosur",               "Tamil Nadu",      "hosur",              "ta"),
    ("Cuddalore",           "Tamil Nadu",      "cuddalore",          "ta"),
    ("Tiruvannamalai",      "Tamil Nadu",      "tiruvannamalai",     "ta"),
    ("Rajapalayam",         "Tamil Nadu",      "rajapalayam",        "ta"),
    ("Pudukkottai",         "Tamil Nadu",      "pudukkottai",        "ta"),
    ("Nagapattinam",        "Tamil Nadu",      "nagapattinam",       "ta"),
    ("Neyveli",             "Tamil Nadu",      "neyveli",            "ta"),
    ("Karaikkudi",          "Tamil Nadu",      "karaikkudi",         "ta"),
    ("Ambur",               "Tamil Nadu",      "ambur",              "ta"),
    ("Krishnagiri",         "Tamil Nadu",      "krishnagiri",        "ta"),
    ("Sivakasi",            "Tamil Nadu",      "sivakasi",           "ta"),
    # Kerala
    ("Thiruvananthapuram",  "Kerala",          "thiruvananthapuram", "ml"),
    ("Kochi",               "Kerala",          "kochi",              "ml"),
    ("Kozhikode",           "Kerala",          "kozhikode",          "ml"),
    ("Thrissur",            "Kerala",          "thrissur",           "ml"),
    ("Kollam",              "Kerala",          "kollam",             "ml"),
    ("Palakkad",            "Kerala",          "palakkad",           "ml"),
    ("Alappuzha",           "Kerala",          "alappuzha",          "ml"),
    ("Malappuram",          "Kerala",          "malappuram",         "ml"),
    ("Kannur",              "Kerala",          "kannur",             "ml"),
    ("Kasaragod",           "Kerala",          "kasaragod",          "ml"),
    ("Kottayam",            "Kerala",          "kottayam",           "ml"),
    ("Thrippunithura",      "Kerala",          "thrippunithura",     "ml"),
    ("Manjeri",             "Kerala",          "manjeri",            "ml"),
    ("Thalassery",          "Kerala",          "thalassery",         "ml"),
    ("Guruvayur",           "Kerala",          "guruvayur",          "ml"),
    # Goa + Puducherry
    ("Panaji",              "Goa",             "panaji",             "en"),
    ("Margao",              "Goa",             "margao",             "en"),
    ("Vasco da Gama",       "Goa",             "vasco-da-gama",      "en"),
    ("Mapusa",              "Goa",             "mapusa",             "en"),
    ("Ponda",               "Goa",             "ponda",              "en"),
    ("Puducherry",          "Puducherry",      "puducherry",         "ta"),
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        for name, state, slug, lang in CITIES:
            stmt = insert(City).values(
                name=name, state=state, slug=slug, lang_default=lang
            ).on_conflict_do_nothing(index_elements=["slug"])
            await session.execute(stmt)
        await session.commit()

    await engine.dispose()
    print(f"Seeded {len(CITIES)} cities.")


if __name__ == "__main__":
    asyncio.run(seed())
