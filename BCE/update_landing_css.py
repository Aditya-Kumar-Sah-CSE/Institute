import re

with open('src/app/Landing.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace :root section
root_pattern = r":root\s*\{[\s\S]*?(?=\n\n|\n\.landing-container)"
new_root = """:root {
  /* Project Theme Colors */
  --human-primary: var(--accent-primary);
  --human-secondary: var(--accent-secondary);
  --human-accent: var(--accent-info);
  --human-highlight: var(--bg-elevated);
  
  --landing-bg: var(--bg-primary);
  --landing-card-bg: var(--glass-bg);
  --landing-card-border: var(--glass-border);
  
  --gradient-human: var(--gradient-primary);
  --gradient-warm: var(--gradient-hero);
}"""

content = re.sub(root_pattern, new_root, content)

# Replace hardcoded RGBA for primary (255, 126, 95)
def repl_primary(match):
    op = float(match.group(1))
    return f"color-mix(in srgb, var(--human-primary) {int(op*100)}%, transparent)"

# Replace hardcoded RGBA for secondary (254, 180, 123)
def repl_secondary(match):
    op = float(match.group(1))
    return f"color-mix(in srgb, var(--human-secondary) {int(op*100)}%, transparent)"

content = re.sub(r"rgba\(\s*255\s*,\s*126\s*,\s*95\s*,\s*([0-9.]+)\s*\)", repl_primary, content)
content = re.sub(r"rgba\(\s*254\s*,\s*180\s*,\s*123\s*,\s*([0-9.]+)\s*\)", repl_secondary, content)
content = content.replace("rgba(255,126,95,0)", "transparent")
content = content.replace("rgba(254,180,123,0)", "transparent")

with open('src/app/Landing.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Landing.css")
