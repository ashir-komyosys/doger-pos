$migrationsDir = Join-Path $PSScriptRoot 'apps\backend\prisma\migrations'
$outputPath = Join-Path $PSScriptRoot 'supabase_schema.sql'
$files = Get-ChildItem -Path $migrationsDir -Directory | Sort-Object Name
$out = "-- Dogar's Fire & Flavour - Complete Supabase Schema`n"
$out += "-- Generated from Prisma migrations`n"
$out += "-- Run this in Supabase SQL Editor`n"
$out += "-- IMPORTANT: This creates the schema but does not record Prisma migration history.`n"
$out += "-- Before running `prisma migrate deploy`, mark each included migration as applied`n"
$out += "-- with `prisma migrate resolve --applied <migration-name>` using a direct PostgreSQL`n"
$out += "-- connection (not Supabase's transaction pooler). Commands are printed below.`n"
$out += "`n"

foreach ($f in $files) {
    $migration = Join-Path $f.FullName 'migration.sql'
    if (-not (Test-Path -LiteralPath $migration)) {
        continue
    }
    $out += "-- ============================================`n"
    $out += "-- Migration: " + $f.Name + "`n"
    $out += "-- ============================================`n"
    $out += "`n"
    $out += Get-Content $migration -Raw
    $out += "`n`n`n"
}

[System.IO.File]::WriteAllText(
    $outputPath,
    $out,
    [System.Text.UTF8Encoding]::new($false)
)
Write-Host "Schema written to $outputPath"
Write-Host "After applying the SQL, run these from the repository root before starting the backend:"
foreach ($f in $files) {
    if (Test-Path -LiteralPath (Join-Path $f.FullName 'migration.sql')) {
        Write-Host "pnpm --filter @nodedr-restaurant/backend exec prisma migrate resolve --applied $($f.Name)"
    }
}
