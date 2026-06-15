import requests, re, time, json, random, urllib3
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin, unquote
from google.cloud import storage, firestore

urllib3.disable_warnings()

BUCKET = "genius-makers-academy"
PROJECT = "sala-innovation-labs-website"
OUT = Path.home() / "genius-makers-academy" / "papers_temp"
OUT.mkdir(parents=True, exist_ok=True)

storage_client = storage.Client(project=PROJECT)
db = firestore.Client(project=PROJECT)
bucket = storage_client.bucket(BUCKET)

print("Loading existing Firebase files...")
existing = set(b.name.split("/")[-1].lower() for b in bucket.list_blobs(prefix="past-papers/"))
print(f"Already have {len(existing)} files — will skip these")

AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
]
def h(): return {"User-Agent": random.choice(AGENTS), "Referer": "https://www.google.co.za/"}

TARGET_SUBJECTS = {
    "mathematics": "Mathematics",
    "maths p": "Mathematics",
    "math p": "Mathematics",
    "wiskunde": "Mathematics",
    "physical science": "Physical Sciences",
    "fisiese wetenskappe": "Physical Sciences",
    "fisika": "Physical Sciences",
    "math lit": "Mathematical Literacy",
    "maths lit": "Mathematical Literacy",
    "mathematical lit": "Mathematical Literacy",
    "wiskunde geletterdheid": "Mathematical Literacy",
    "geography": "Geography",
    "geografie": "Geography",
    "life science": "Life Sciences",
    "lewenswetenskap": "Life Sciences",
    "agricultural science": "Agricultural Sciences",
    "landbouwetenskap": "Agricultural Sciences",
    "economics": "Economics",
    "ekonomie": "Economics",
    "accounting": "Accounting",
    "rekeningkunde": "Accounting",
    "tourism": "Tourism",
    "toerisme": "Tourism",
    "history": "History",
    "geskiedenis": "History",
}

def get_subject(name):
    n = name.lower()
    for k, v in TARGET_SUBJECTS.items():
        if k in n:
            return v
    return None  # None means skip this file

def upload_to_firebase(fp, filename, subject, session, year, province):
    paper_type = "memo" if any(x in filename.lower() for x in ["memo","memorandum","marking","mark guide"]) else "question"
    language = "Afrikaans" if any(x in filename.lower() for x in ["afr","huistaal","vraestel","afrikaans"]) else "English"
    paper_num = next((p for p in ["P4","P3","P2","P1"] if p.lower() in filename.lower()), "P1")

    storage_path = f"past-papers/NSC/{year}/{session}/Grade12/{subject.replace(' ','_')}/{province}_{filename}"
    blob = bucket.blob(storage_path)

    if not blob.exists():
        blob.upload_from_filename(str(fp), content_type="application/pdf")
        print(f"      ☁️  Uploaded to Firebase Storage")

    pub_url = f"https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/{storage_path.replace('/','%2F')}?alt=media"

    doc_id = f"NSC_12_{year}_{session}_{subject.replace(' ','_')[:12]}_{paper_num}_{paper_type}_{language}_{province[:6]}"[:100]
    db.collection("papers").document(doc_id).set({
        "id": doc_id,
        "title": f"{subject} Grade 12 {year} {session} {paper_num} {'Memorandum' if paper_type=='memo' else 'Question Paper'} ({language})",
        "subject": subject, "grade": 12, "year": year,
        "curriculum": "NSC", "paperNumber": paper_num,
        "type": paper_type, "language": language,
        "session": session, "province": province,
        "fileUrl": pub_url, "storagePath": storage_path,
        "fileSize": fp.stat().st_size,
        "downloadCount": 0, "topics": [],
        "isVerified": True, "uploadedBy": "GMA_SYSTEM",
        "source": f"{province} Education Department",
        "originalFilename": filename,
        "createdAt": firestore.SERVER_TIMESTAMP
    }, merge=True)
    existing.add(filename.lower())
    return pub_url

def download_and_process(url, filename, session, year, province):
    subject = get_subject(filename)
    if subject is None:
        return "skip_subject"

    fn = re.sub(r'[<>:"/\\|?*\s]+', '_', filename).strip("_")
    if not fn.lower().endswith(".pdf"): fn += ".pdf"

    if fn.lower() in existing:
        print(f"   ⏭️  HAVE: {fn[:60]}")
        return "skip_exists"

    fp = OUT / fn
    try:
        r = requests.get(url, headers=h(), timeout=60, stream=True, verify=False)
        r.raise_for_status()
        with open(fp, "wb") as f:
            for chunk in r.iter_content(8192): f.write(chunk)
        if fp.stat().st_size < 500:
            fp.unlink()
            return "fail"

        upload_to_firebase(fp, fn, subject, session, year, province)
        fp.unlink()  # delete local after upload to save space
        
        # Define paper_type dynamically based on filename for console print
        paper_type = 'memo' if any(x in fn.lower() for x in ['memo','memorandum']) else 'question'
        print(f"   ✅ {subject} | {paper_type} | {fn[:50]}")
        return "ok"
    except Exception as e:
        print(f"   ❌ {fn[:50]}: {str(e)[:60]}")
        return "fail"

def scrape_page(url, session, year, province):
    print(f"\n📂 {province} | {session} | {year}")
    print(f"   {url[:80]}")
    try:
        r = requests.get(url, headers=h(), timeout=30, verify=False)
        r.raise_for_status()
        soup = BeautifulSoup(r.content, "html.parser")
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            text = a.get_text(strip=True)
            if any(x in href.lower() for x in [".pdf", ".zip"]) or \
               any(x in href for x in ["LinkClick", "download", "GetFile"]):
                full_url = urljoin(url, href)
                name = text if text else href.split("/")[-1]
                links.append((full_url, name))
        print(f"   Found {len(links)} links")
        return links
    except Exception as e:
        print(f"   ⚠️  {e}")
        return []

# ALL PAGES — 2022 to 2025 — Core subjects only
PAGES = [
    # 2025
    ("https://www.ecexams.co.za/2025_November_Gr_12_NSC_Exams.htm", "Term4_November", 2025, "EasternCape"),
    ("https://www.ecexams.co.za/2025_September_Gr_12_Preparatory_Exams.htm", "Term3_Trial", 2025, "EasternCape"),
    ("https://www.ecexams.co.za/2025_MayJune_Gr_12_NSC_DBE_Exams.htm", "Term2_MayJune", 2025, "EasternCape"),
    ("https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/2025NSCNovemberpastpapers.aspx", "Term4_November", 2025, "National_DBE"),
    ("https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/2025MayJuneExampapers.aspx", "Term2_MayJune", 2025, "National_DBE"),

    # 2024
    ("https://www.ecexams.co.za/2024_November_Gr_12_NSC_DBE_Exams.htm", "Term4_November", 2024, "EasternCape"),
    ("https://www.ecexams.co.za/2024_September_Gr_12_Preparatory_Exams.htm", "Term3_Trial", 2024, "EasternCape"),
    ("https://www.ecexams.co.za/2024_MayJune_Gr_12_NSC_DBE_Exams.htm", "Term2_MayJune", 2024, "EasternCape"),
    ("https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/2024NSCNovemberpastpapers.aspx", "Term4_November", 2024, "National_DBE"),
    ("https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/2024MayJuneExampapers.aspx", "Term2_MayJune", 2024, "National_DBE"),

    # 2023
    ("https://www.ecexams.co.za/2023_November_Gr_12_NSC_DBE_Exams.htm", "Term4_November", 2023, "EasternCape"),
    ("https://www.ecexams.co.za/2023_September_Gr_12_Preparatory_Exams.htm", "Term3_Trial", 2023, "EasternCape"),
    ("https://www.ecexams.co.za/2023_MayJune_Gr_12_NSC_DBE_Exams.htm", "Term2_MayJune", 2023, "EasternCape"),
    ("https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/2023NSCNovemberpastpapers.aspx", "Term4_November", 2023, "National_DBE"),
    ("https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/2023MayJuneExampapers.aspx", "Term2_MayJune", 2023, "National_DBE"),

    # 2022
    ("https://www.ecexams.co.za/2022_November_Gr_12_NSC_DBE_Exams.htm", "Term4_November", 2022, "EasternCape"),
    ("https://www.ecexams.co.za/2022_September_Gr_12_Preparatory_Exams.htm", "Term3_Trial", 2022, "EasternCape"),
    ("https://www.ecexams.co.za/2022_MayJune_Gr_12_NSC_DBE_Exams.htm", "Term2_MayJune", 2022, "EasternCape"),
    ("https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/2022NSCNovemberpastpapers.aspx", "Term4_November", 2022, "National_DBE"),
    ("https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/2022MayJuneExamPapers.aspx", "Term2_MayJune", 2022, "National_DBE"),
]

print("=" * 60)
print("GMA — CORE SUBJECTS — Grade 12 — 2022 to 2025")
print("Subjects: Maths, Physical Sciences, Maths Lit, Geography,")
print("Life Sciences, Agricultural Sciences, Economics,")
print("Accounting, Tourism, History")
print("=" * 60)

total_ok = 0
total_skip = 0
total_fail = 0

for url, session, year, province in PAGES:
    links = scrape_page(url, session, year, province)
    for link_url, link_text in links:
        result = download_and_process(link_url, link_text, session, year, province)
        if result == "ok": total_ok += 1
        elif result in ("skip_exists", "skip_subject"): total_skip += 1
        else: total_fail += 1
        time.sleep(1.0)
    time.sleep(2.0)

print(f"\n{'=' * 60}")
print(f"🎉 COMPLETE")
print(f"   ✅ Downloaded + Uploaded: {total_ok}")
print(f"   ⏭️  Skipped:              {total_skip}")
print(f"   ❌ Failed:               {total_fail}")
print(f"\nAll papers are now in Firebase Storage AND Firestore!")
