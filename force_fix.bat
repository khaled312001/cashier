@echo off
chcp 65001
echo Starting history rewrite...

echo 1. Creating database backup...
if not exist "backups" mkdir backups
xcopy /Y /I "data\*.db" "backups\"

echo 2. Creating orphan branch...
git checkout --orphan temp_clean_branch

echo 3. Unstaging all files...
git rm -rf .

echo 4. Adding files (respecting .gitignore)...
git add .

echo 5. Committing clean state...
git commit -m "feat: Initial commit (clean history)"

echo 6. Deleting old main branch...
git branch -D main

echo 7. Renaming current branch to main...
git branch -m main

echo 8. Force pushing to origin...
git push -f origin main

echo Done!
PAUSE
