from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm

styles = getSampleStyleSheet()
story = []

logo_path = 'installers/funesterie_logo.png'  # place your logo file here

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

Contact: licensing@funesterie.me
"""

# Add logo if available
try:
    img = Image(logo_path, width=8*cm, height=8*cm)
    story.append(img)
except Exception as e:
    print('Logo not found or failed to load:', e)

story.append(Spacer(1, 12))
story.append(Paragraph(text.replace("\n", "<br/>"), styles["Normal"]))
story.append(Spacer(1, 12))

output_path = 'installers/FCL_Commercial_License.pdf'

doc = SimpleDocTemplate(output_path, pagesize=A4)
doc.build(story)

print('Written', output_path)
