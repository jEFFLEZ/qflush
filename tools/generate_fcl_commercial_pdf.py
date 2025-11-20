from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
import os

styles = getSampleStyleSheet()
story = []

base_dir = os.path.dirname(__file__)
logo_path = os.path.join(base_dir, '..', 'installers', 'funesterie_logo.png')  # resolved relative path

text = """FUNESTERIE COMMERCIAL LICENSE (FCL-PRO 1.0)

This document certifies the commercial usage rights for the
Funesterie Config Language (FCL).

Allowed under this license:
- Commercial integration in software
- SaaS product usage
- Internal company tooling
- Redistribution inside commercial products
- Authorized use of “FCL Compatible™” badge

Prohibited:
- Reselling FCL as standalone
- Creating competing derivatives
- Using Funesterie™ branding without permission

Contact: cellaurojeffrey@gmail.com

To purchase a commercial license for FCL:
https://cellaurojeff.gumroad.com/l/jxktq
"""

# Add logo if available
try:
    if os.path.exists(logo_path):
        img = Image(logo_path, width=8*cm, height=8*cm)
        story.append(img)
    else:
        print('Logo not found at', logo_path)
except Exception as e:
    print('Logo failed to load:', e)

story.append(Spacer(1, 12))
story.append(Paragraph(text.replace("\n", "<br/>"), styles["Normal"]))
story.append(Spacer(1, 12))

output_path = os.path.join(base_dir, '..', 'installers', 'FCL_Commercial_License.pdf')

os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = SimpleDocTemplate(output_path, pagesize=A4)
doc.build(story)

print('Written', output_path)
