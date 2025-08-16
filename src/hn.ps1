$web = Invoke-WebRequest -Uri 'https://news.ycombinator.com/'
$html = $web.Content
$matches = Select-String -InputObject $html -AllMatches '<a class="titlelink" href="([^"+)'" 
$links = $matches.Matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -First 10
$links | Out-File hn.txt