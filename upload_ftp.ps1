$publishDir = "C:\Users\Aluno\Documents\armilla\Site-Armilla\Armilla.Backend\publish"
$ftpUrl = "ftp://site77845.siteasp.net/"
$userPass = "site77845:i!6EPc+95Fr-"
$files = Get-ChildItem -Path $publishDir -File -Recurse
$total = $files.Count
$count = 0
foreach ($file in $files) {
    $count++
    $relativePath = $file.FullName.Substring($publishDir.Length + 1).Replace('\', '/')
    $targetUrl = "$ftpUrl$relativePath"
    Write-Host "[$count/$total] Uploading $relativePath..."
    curl.exe --ftp-create-dirs -T $file.FullName -u $userPass $targetUrl --silent
}
Write-Host "Upload completed successfully."
