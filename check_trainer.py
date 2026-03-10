import os
base = r'C:\Users\Lenar Yolola\OneDrive\Desktop\Figma\lms-app\src\pages\trainer'
files = ['TrainerHome','TrainerStream','TrainerCourse','TrainerCourses',
         'TrainerClasswork','TrainerPeople','TrainerGrades',
         'TrainerSectors','TrainerSectorDetail']
for f in files:
    path = os.path.join(base, f + '.jsx')
    if not os.path.exists(path):
        print(f'{f}: MISSING')
        continue
    content = open(path, encoding='utf-8').read()
    lines = content.count('\n')
    has_export = 'export default' in content
    has_return = 'return (' in content
    print(f'{f}: {lines} lines | export={has_export} | return={has_return}')
