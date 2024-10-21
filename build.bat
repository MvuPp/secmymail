@echo off

set OUTPUT=build\secmymail.xpi
set SOURCE_DIR=SecMyMail_App

if not exist "%~dp0%OUTPUT%" mkdir "%~dp0%OUTPUT%"

if exist "%OUTPUT%" del /f "%OUTPUT%"

powershell -Command "Compress-Archive -Path '%SOURCE_DIR%\*' -DestinationPath '%OUTPUT%'"

if %errorlevel% equ 0 (
    echo.
    echo Build successful. The add-on has been created in %OUTPUT%
) else (
    echo.
    echo Build failed
)