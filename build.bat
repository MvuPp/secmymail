@echo off

set OUTPUT=build\secmymail.xpi
set FILES=manifest.json assets pages scripts styles

if not exist build mkdir build
if exist %OUTPUT% del %OUTPUT%

powershell -Command "Compress-Archive -Path %FILES% -DestinationPath %OUTPUT%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo Build successful. The add-on has been created in %OUTPUT%
) else (
    echo.
    echo Build failed
)