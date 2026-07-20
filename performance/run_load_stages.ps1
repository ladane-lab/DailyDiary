$stages = @(
    @{ vus = 1; duration = "20s" },
    @{ vus = 10; duration = "20s" },
    @{ vus = 25; duration = "20s" },
    @{ vus = 50; duration = "20s" },
    @{ vus = 100; duration = "20s" },
    @{ vus = 250; duration = "20s" }
)

$finalReport = @()

foreach ($stage in $stages) {
    $v = $stage.vus
    $d = $stage.duration
    Write-Host "Running $v VUs for $d..."
    $summaryFile = "results\summary_${v}.json"
    & "C:\Program Files\k6\k6.exe" run -e VUS=$v -e DURATION=$d --summary-export=$summaryFile load.js | Out-Null
    
    if (Test-Path $summaryFile) {
        $data = Get-Content $summaryFile | ConvertFrom-Json
        $httpReqs = $data.metrics.http_req_duration.values
        $failed = $data.metrics.http_req_failed.values.rate
        $rps = $data.metrics.http_reqs.values.rate
        $reqCount = $data.metrics.http_reqs.values.count
        
        $stageResult = @{
            VUs = $v
            Avg = $httpReqs.avg
            Med = $httpReqs.med
            P90 = $httpReqs."p(90)"
            P95 = $httpReqs."p(95)"
            P99 = $httpReqs."p(99)"
            RPS = $rps
            ErrorRate = $failed
            TotalRequests = $reqCount
        }
        $finalReport += $stageResult
        
        if ($failed -gt 0.05) {
            Write-Host "Error rate > 5%, stopping load test at $v VUs."
            break
        }
    }
}

$finalReport | ConvertTo-Json | Out-File "results\load_test_report.json"
Write-Host "Load testing complete."
