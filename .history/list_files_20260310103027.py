import os
base = r'C:\Users\Lenar Yolola\OneDrive\Desktop\Figma\lms-app\src'
for root, dirs, files in os.walk(base):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for f in sorted(files):
        if f.endswith(('.jsx', '.js', '.css')):
            rel = os.path.relpath(os.path.join(root, f), base)
            print(rel)
