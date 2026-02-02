@echo off
echo Adding changes...
git add .
echo Creating commit...
git commit -m "Fix OG image: improve token name parsing and coin icon loading"
echo Pushing to GitHub...
git push origin main
if %errorlevel% equ 0 (
    echo Successfully pushed to GitHub!
) else (
    echo Error pushing. Check connection.
    pause
)
