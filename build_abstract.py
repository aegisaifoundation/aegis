from __future__ import annotations

from io import BytesIO
from pathlib import Path
from zipfile import ZipFile
import re

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.shared import Inches, Pt
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SOURCE = Path(r"C:\Users\gokul_oae3l3i\OneDrive\Desktop\KSC_Extended_Abstract_Federated_Medical_AI-compressed.docx")
OUT = Path(r"C:\aegis\KSC_Extended_Abstract_Formatted.docx")

TITLE = "DECENTRALIZED PRIVACY-PRESERVING FEDERATED MEDICAL AI WITH BLOCKCHAIN AND SELECTIVE LORA"

INTRO = [
    "Artificial intelligence (AI) can improve patient management and diagnosis, but centralized medical data create security and privacy risks. Federated learning (FL) keeps patient records on local devices and sends model updates for aggregation [1, 8]. Full-model training, however, can exceed the computing capacity of resource-constrained devices. Low-Rank Adaptation (LoRA) reduces this burden by training small low-rank matrices rather than all model parameters [2].",
    "A conventional single-server FL system still depends on a central aggregation point. It also offers limited client-to-client communication and can be vulnerable to poisoning attacks. Rejecting every unusual update could also exclude valid but rare-disease cases. Existing approaches address parts of this problem: retrieval-augmented generation (RAG) can expose patient information [3, 9], differential privacy can reduce utility [4], and secure aggregation or blockchain methods do not by themselves provide integrated model validation and participant scoring [5–7].",
    "This work proposes a privacy-preserving framework that combines selective LoRA, multiple blockchain-linked servers, encrypted communication, tensor-level risk assessment, client scoring, trust-aware aggregation, differentially private RAG (DP-RAG), and Fast Healthcare Interoperability Resources (FHIR) data portability. The design aims to keep raw records on clients, tolerate server failures, and reduce the influence of unreliable or malicious updates."
]

METHODS = [
    "Selective adaptation and communication. For layer l, the update is factorized as ΔWₗ = AₗBₗ, with rank r ≪ d; this reduces trainable parameters from O(d²) to O(dr). A client-specific factor Lₖ selects the number of adapted layers to match its hardware, and only LoRA matrices are transmitted. Updates use hybrid encryption: a symmetric key encrypts the update, and the server’s public key encrypts that symmetric key. Clients communicate with randomly selected servers through gRPC (Google Remote Procedure Call), which uses HTTP/2 and Protocol Buffers.",
    "Reliability and update validation. Clients send periodic heartbeats. Heartbeat consistency is Cᵢ = min(1, Hᵢ/Hₘᵢₙ) × Sᵢ(t), where Hᵢ is the observed heartbeat count, Hₘᵢₙ is the minimum expected count, and Sᵢ(t) = 1 − (1/m)Σₖ|tₖ − t̄|/t̄ measures timing regularity. For each update, magnitude Mᵢ = ||ΔWᵢ|| and direction Dᵢ, measured by cosine similarity to the global average, define risk Rᵢ = αMᵢ + β(1 − Dᵢ), where α + β = 1. Thresholds T₁ and T₂ classify tensors as safe, sensitive, or risky; sensitive and risky tensors undergo sandbox testing instead of automatic rejection. Blockchain-linked servers vote on updates, with Vᵢ = n_valid/N; at least half must approve. Activity is immutably logged, and a client-to-client blockchain retains the global LoRA if all servers fail.",
    "Scoring, aggregation, and evaluation. The event score is Sᵢ,ₜ = λ₁Cᵢ + λ₂(1 − Rᵢ) + λ₃Vᵢ, where the λ weights sum to one. Scores accumulate over time, and clients below percentile threshold θₚ are blacklisted. Trust-aware aggregation weights each client by data size nₖ and score Sₖ: ΔW_global = Σₖ[nₖSₖ/Σⱼ(nⱼSⱼ)]LₖΔWₖ. Repeated updates receive exponential time-decay weights wᵢ = e^(−γ(T−tᵢ)) to limit dominance. For DP-RAG, retrieval uses a local vector database with controlled noise added before storage; the global LoRA responds when local records are not relevant and provides a disclaimer. Rare-disease data can be converted to FHIR for secure sharing.",
    "A simulation used 20 clients and 3 servers, non-uniform communication, and a subset of malicious clients. The analysis covered 1,000 events. A Shapiro–Wilk test was applied to a 200-event sample, and outlier-detection methods informed the percentile threshold."
]

RESULTS = [
    "Score distribution. Across 1,000 events, scores ranged from −0.002 to 0.831 (mean 0.453, standard deviation 0.160), with slight left skew (−0.15) and kurtosis of −0.46. The Shapiro–Wilk test found no significant departure from normality (W = 0.9935, p = 0.531), supporting distribution-based threshold selection. The 15th percentile (θₚ = 0.274) was selected as the blacklist boundary and flagged 106 events. The 10th percentile (0.243) was judged too strict, while the 20th (0.316) was judged too lenient. Table 1 summarizes the distribution.",
    "Heartbeat consistency and tensor risk. Mean heartbeat consistency was 0.479. Client C20 scored 0.0 because it sent no heartbeats in its recorded events, marking it as unreliable under this measure. Mean tensor risk was approximately 0.60. C1 (0.657) and C17 (0.655) exceeded the 0.65 high-risk threshold and would be sent to sandbox testing for further review.",
    "Temporal behaviour and aggregation. Rolling mean scores for reliable clients, including C6, C11, and C15, remained above the threshold. C20 remained persistently low, consistent with long-term unreliability rather than a temporary fluctuation. Time-decay weighting was designed to account for repeated and asynchronous updates. Aggregation weights ranged from 3.0% to 6.3%, compared with a uniform weight of 5.0%. C20 received the lowest weight (3.0%), while higher-scoring clients such as C5, C11, and C13 received about 6%. Thus, the scoring mechanism reduced C20’s contribution without excluding higher-scoring clients.",
    "Client scores and prototype. Most clients had mean composite scores between 0.40 and 0.52. C20 had the lowest mean (0.284), marginally above the 0.274 cutoff. It was therefore down-weighted and flagged for low quality but was not blacklisted on its mean score alone. Applying a fixed threshold avoids continuous re-ranking as the active client set changes. The working prototype demonstrated heartbeat receipt, client registration, LoRA encryption and upload, return of the decrypted global LoRA, and aggregation of updates from two clients. A 4.31 MB model was aggregated in 0.23 s, demonstrating an end-to-end secure gRPC pipeline.",
    "Limitations and conclusion. The framework is intended to support resource-constrained clients in privacy-preserving federated medical AI by combining scoring, tensor risk tagging, and blockchain validation. The results are from simulation rather than real patient data, and the prototype result does not establish clinical performance or immunity to adversarial, poisoning, or inference attacks. Participation levels, communication overhead, blockchain computation and storage, and the privacy–utility trade-off from differential-privacy noise remain limitations. Future work includes lightweight consensus, attention-based aggregation, adaptive DP-RAG noise control, and validation on real hospital datasets."
]

REFERENCES = [
    'McMahan, B., Moore, E., Ramage, D., Hampson, S., & Agüera y Arcas, B. “Communication-Efficient Learning of Deep Networks from Decentralized Data.” AISTATS, 2017.',
    'Hu, E. J., et al. “LoRA: Low-Rank Adaptation of Large Language Models.” ICLR, 2022.',
    'Lewis, P., et al. “Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.” NeurIPS, 2020.',
    'Abadi, M., et al. “Deep Learning with Differential Privacy.” ACM CCS, 2016.',
    'Bonawitz, K., et al. “Practical Secure Aggregation for Privacy-Preserving Machine Learning.” ACM CCS, 2017.',
    'Cao, X., et al. “FLTrust: Byzantine-Robust Federated Learning via Trust Bootstrapping.” NDSS, 2020.',
    'Castro, M., & Liskov, B. “Practical Byzantine Fault Tolerance.” OSDI, 1999.',
    'Rieke, N., et al. “The Future of Digital Health with Federated Learning.” npj Digital Medicine, 2020.',
    'Karpukhin, V., et al. “Dense Passage Retrieval for Open-Domain Question Answering.” EMNLP, 2020.',
    'Bender, D., & Sartipi, K. “HL7 FHIR: An Agile and RESTful Approach to Healthcare Information Exchange.” IEEE CBMS, 2013.'
]

def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), fill)
    tc_pr.append(shd)

def set_cell_border(cell, **kwargs) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in('w:tcBorders')
    if borders is None:
        borders = OxmlElement('w:tcBorders')
        tc_pr.append(borders)
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        if edge in kwargs:
            tag = 'w:{}'.format(edge)
            element = borders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                borders.append(element)
            for key in ['val', 'sz', 'space', 'color']:
                if key in kwargs[edge]:
                    element.set(qn('w:{}'.format(key)), str(kwargs[edge][key]))

def format_run(run, bold=False, italic=False):
    run.font.name = 'Times New Roman'
    run._element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
    run.font.size = Pt(12)
    run.bold = bold
    run.italic = italic

def add_body(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.first_line_indent = Inches(0.25)
    format_run(p.add_run(text))
    return p

def add_section(doc, heading):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.5
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    format_run(p.add_run(heading), bold=True)

def add_caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.space_after = Pt(4)
    format_run(p.add_run(text), italic=True)

doc = Document()
sec = doc.sections[0]
sec.page_width = Inches(8.2677)
sec.page_height = Inches(11.6929)
sec.top_margin = Inches(0.8)
sec.bottom_margin = Inches(0.8)
sec.left_margin = Inches(0.9)
sec.right_margin = Inches(0.9)
normal = doc.styles['Normal']
normal.font.name = 'Times New Roman'
normal._element.rPr.rFonts.set(qn('w:eastAsia'), 'Times New Roman')
normal.font.size = Pt(12)
normal.paragraph_format.line_spacing = 1.5

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.paragraph_format.space_before = Pt(18)
title.paragraph_format.space_after = Pt(20)
title.paragraph_format.line_spacing = 1.5
title.paragraph_format.keep_with_next = True
format_run(title.add_run(TITLE), bold=True)

add_section(doc, 'Introduction')
for text in INTRO:
    add_body(doc, text)

add_section(doc, 'Materials and methods')
for idx, text in enumerate(METHODS):
    add_body(doc, text)
    if idx == 0:
        with ZipFile(SOURCE) as zf:
            image_bytes = zf.read('word/media/image1.png')
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        p.add_run().add_picture(BytesIO(image_bytes), width=Inches(3.75))
        add_caption(doc, 'Fig. 1. Decentralized federated-learning architecture with blockchain validation, selective LoRA adaptation, and secure communication.')

add_section(doc, 'Results and Discussions')
for idx, text in enumerate(RESULTS):
    if idx == 1:
        p = doc.add_paragraph()
        p.paragraph_format.keep_with_next = True
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.5
        format_run(p.add_run('Table 1. Summary of score distribution characteristics.'), bold=True)
        table = doc.add_table(rows=1, cols=2)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        table.columns[0].width = Inches(3.4)
        table.columns[1].width = Inches(3.1)
        headers = ('Parameter', 'Value')
        for c, value in zip(table.rows[0].cells, headers):
            c.text = value
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_shading(c, 'E6E6E6')
            for pp in c.paragraphs:
                pp.paragraph_format.line_spacing = 1.5
                for rr in pp.runs: format_run(rr, bold=True)
        rows = [
            ('Total events', '1,000'),
            ('Mean / standard deviation', '0.453 / 0.160'),
            ('Skewness / kurtosis', '−0.15 / −0.46'),
            ('Range', '−0.002 to 0.831'),
            ('10th / 15th / 20th percentile', '0.243 / 0.274 / 0.316'),
            ('Blacklist candidates', '106 events')
        ]
        for left, right in rows:
            cells = table.add_row().cells
            cells[0].width = Inches(3.4)
            cells[1].width = Inches(3.1)
            for cell, value in zip(cells, (left, right)):
                cell.text = value
                cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
                for pp in cell.paragraphs:
                    pp.paragraph_format.line_spacing = 1.5
                    pp.paragraph_format.space_after = Pt(1)
                    for rr in pp.runs: format_run(rr)
        border = {'val': 'single', 'sz': '4', 'color': '777777'}
        for row in table.rows:
            for cell in row.cells:
                set_cell_border(cell, top=border, bottom=border, left=border, right=border)
        doc.add_paragraph().paragraph_format.space_after = Pt(0)
    add_body(doc, text)

add_section(doc, 'References')
for i, ref in enumerate(REFERENCES, start=1):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.first_line_indent = Inches(-0.3)
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.space_after = Pt(0)
    format_run(p.add_run(f'{i}. {ref}'))

doc.core_properties.author = ''
doc.core_properties.last_modified_by = ''
doc.core_properties.title = TITLE
doc.core_properties.subject = 'Extended abstract'
doc.core_properties.keywords = ''
doc.save(OUT)

def wc(items):
    return len(re.findall(r"\b[\w−–]+(?:[’'-][\w]+)*\b", ' '.join(items)))
print(f'Saved: {OUT}')
print(f'Introduction words: {wc(INTRO)}')
print(f'Materials and methods words: {wc(METHODS)}')
print(f'Results and Discussions words: {wc(RESULTS)}')
print(f'References words: {wc(REFERENCES)}')
print(f'Approximate total words (excluding table/caption/title): {wc(INTRO + METHODS + RESULTS + REFERENCES)}')
