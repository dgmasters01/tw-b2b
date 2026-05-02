<#
.SYNOPSIS
  TW B2B tasks.json v2 마이그레이션: owner / approval_required 필드 추가.

.DESCRIPTION
  tasks.json의 51개 작업에 두 개 신규 필드를 추가한다.
    - owner              : "human" | "autonomous"
    - approval_required  : true | false

  category 필드는 기존 값(bug, dev, ux, design, docs, infra)을 그대로 유지하며
  본 스크립트에서는 일절 건드리지 않는다 (대표님 결정: 옵션 C).

  추정 규칙 (대표님 승인됨):
    title + notes + files_changed 결합 텍스트에 다음 키워드 포함 시
      → owner = "human", approval_required = true
        admin-business, admin-gallery
        DB(단어경계), 스키마, Supabase
        가격, 보장, 메시징, 환불
        .env, PayPal, Resend, API 키
        디자인 승인, 최종 승인
    그 외 모든 작업
      → owner = "autonomous", approval_required = false

  멱등성: 이미 owner / approval_required 필드를 가진 작업은 스킵.

.EXAMPLE
  powershell -File scripts/migrate_tasks_v2.ps1
    dry-run. 분포/샘플만 콘솔 출력. 파일 변경 없음.

.EXAMPLE
  powershell -File scripts/migrate_tasks_v2.ps1 -Apply
    실제 적용. tasks.json.bak_YYYYMMDD 백업을 먼저 만든 뒤
    텍스트 라인 단위로 owner/approval_required 두 줄을 삽입한다.
    기존 필드/포맷/키 순서는 보존.

.NOTES
  - PowerShell 5.1 호환
  - 적용은 텍스트 기반 라인 편집(JSON 재직렬화 X) → diff 최소화
  - 각 task의 마지막 필드가 "notes"라는 사실을 사전 검증한 상태에서만 안전
  - $forceHumanIds 화이트리스트는 키워드 매칭과 무관하게 human/approval=true 강제
#>

[CmdletBinding()]
param(
  [switch]$Apply,
  [string]$Path = "tasks.json"
)

$ErrorActionPreference = "Stop"

# ============================================================
# 1. 키워드 정의
# ============================================================
$wordBoundaryKeywords  = @('DB')
$caseInsensitiveKeywords = @(
  'admin-business', 'admin-gallery',
  'Supabase', 'PayPal', 'Resend',
  '.env', 'API 키'
)
$exactKeywords = @(
  '스키마', '가격', '보장', '메시징', '환불',
  '디자인 승인', '최종 승인'
)

# 키워드 매칭과 무관하게 무조건 owner=human, approval_required=true로 강제할 ID
# (대표님 dry-run 검토 결과 false-negative로 식별된 항목)
$forceHumanIds = @('SQ-F', 'CHG-15', 'BL-005', 'SQ-G')

function Test-RequiresHuman {
  param([string]$Text)
  if ([string]::IsNullOrEmpty($Text)) { return @($false, $null) }

  foreach ($kw in $wordBoundaryKeywords) {
    if ($Text -cmatch "\b$([regex]::Escape($kw))\b") { return @($true, $kw) }
  }
  foreach ($kw in $caseInsensitiveKeywords) {
    if ($Text -imatch [regex]::Escape($kw)) { return @($true, $kw) }
  }
  foreach ($kw in $exactKeywords) {
    if ($Text -match [regex]::Escape($kw)) { return @($true, $kw) }
  }
  return @($false, $null)
}

# ============================================================
# 2. 파일 읽기 + 파싱
# ============================================================
if (-not (Test-Path $Path)) {
  Write-Host "ERROR: $Path 파일이 없습니다." -ForegroundColor Red
  exit 1
}

$rawJson = Get-Content $Path -Raw -Encoding UTF8
$data    = $rawJson | ConvertFrom-Json

if (-not $data.tasks) {
  Write-Host "ERROR: tasks 배열을 찾을 수 없습니다." -ForegroundColor Red
  exit 1
}

# ============================================================
# 3. 각 작업 분석
# ============================================================
$results = @()
$skipped = 0

foreach ($task in $data.tasks) {
  $names       = $task.PSObject.Properties.Name
  $hasOwner    = $names -contains 'owner'
  $hasApproval = $names -contains 'approval_required'

  if ($hasOwner -and $hasApproval) {
    $skipped++
    $results += [PSCustomObject]@{
      id                = $task.id
      title             = $task.title
      owner             = $task.owner
      approval_required = $task.approval_required
      action            = 'skip'
      matched_keyword   = $null
    }
    continue
  }

  $haystackParts = @()
  $haystackParts += [string]$task.title
  if ($task.notes)         { $haystackParts += [string]$task.notes }
  if ($task.files_changed) { $haystackParts += ($task.files_changed -join ' ') }
  $combined = $haystackParts -join ' '

  $check        = Test-RequiresHuman -Text $combined
  $needsHuman   = $check[0]
  $matchedKw    = $check[1]

  # 화이트리스트 강제 (키워드 매칭 결과를 덮어씀)
  if ($forceHumanIds -contains $task.id) {
    $needsHuman = $true
    $matchedKw  = 'whitelist'
  }

  $results += [PSCustomObject]@{
    id                = $task.id
    title             = $task.title
    owner             = $(if ($needsHuman) { 'human' } else { 'autonomous' })
    approval_required = $needsHuman
    action            = 'add'
    matched_keyword   = $matchedKw
  }
}

# ============================================================
# 4. 분포 출력
# ============================================================
$mode = if ($Apply) { '[APPLY MODE]' } else { '[DRY-RUN]' }
$add  = $results | Where-Object { $_.action -eq 'add' }

$humanCount      = ($add | Where-Object { $_.owner -eq 'human' }).Count
$autonomousCount = ($add | Where-Object { $_.owner -eq 'autonomous' }).Count
$approvalTrue    = ($add | Where-Object { $_.approval_required -eq $true  }).Count
$approvalFalse   = ($add | Where-Object { $_.approval_required -eq $false }).Count

Write-Host ""
Write-Host "=== TW B2B tasks.json v2 Migration $mode ===" -ForegroundColor Cyan
Write-Host ("총 작업 수    : {0}" -f $data.tasks.Count)
Write-Host ("스킵(이미 보유): {0}" -f $skipped) -ForegroundColor Yellow
Write-Host ("변경 대상     : {0}" -f $add.Count) -ForegroundColor Green

Write-Host ""
Write-Host "--- owner 분포 ---" -ForegroundColor Cyan
Write-Host ("  autonomous : {0}" -f $autonomousCount) -ForegroundColor Green
Write-Host ("  human      : {0}" -f $humanCount)      -ForegroundColor Yellow

Write-Host ""
Write-Host "--- approval_required 분포 ---" -ForegroundColor Cyan
Write-Host ("  false : {0}" -f $approvalFalse) -ForegroundColor Green
Write-Host ("  true  : {0}" -f $approvalTrue)  -ForegroundColor Yellow

Write-Host ""
Write-Host "--- human/approval 매핑 (키워드 매칭된 작업) ---" -ForegroundColor Cyan
$humanItems = $add | Where-Object { $_.owner -eq 'human' }
foreach ($s in $humanItems) {
  Write-Host ("  [{0}] (kw={1}) {2}" -f $s.id, $s.matched_keyword, $s.title) -ForegroundColor Yellow
}
if ($humanItems.Count -eq 0) {
  Write-Host "  (없음)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "--- autonomous 분류된 작업 일부 (검토 샘플) ---" -ForegroundColor Cyan
$autoSamples = $add | Where-Object { $_.owner -eq 'autonomous' } | Get-Random -Count ([Math]::Min(10, ($add | Where-Object { $_.owner -eq 'autonomous' }).Count)) -ErrorAction SilentlyContinue
if (-not $autoSamples) {
  $autoSamples = $add | Where-Object { $_.owner -eq 'autonomous' } | Select-Object -First 10
}
foreach ($s in $autoSamples) {
  Write-Host ("  [{0}] {1}" -f $s.id, $s.title) -ForegroundColor DarkGray
}

# ============================================================
# 5. dry-run 종료
# ============================================================
if (-not $Apply) {
  Write-Host ""
  Write-Host "[DRY-RUN] 변경 없음. 실제 적용은 -Apply 플래그로 실행하세요." -ForegroundColor Cyan
  exit 0
}

# ============================================================
# 6. -Apply: 백업 + 텍스트 라인 편집
# ============================================================
$dateTag = Get-Date -Format 'yyyyMMdd'
$bakPath = "$Path.bak_$dateTag"
if (Test-Path $bakPath) {
  Write-Host ""
  Write-Host "ERROR: 백업 파일 이미 존재: $bakPath" -ForegroundColor Red
  Write-Host "       (수동으로 제거하거나 다른 날짜에 재실행)" -ForegroundColor Red
  exit 1
}
Copy-Item $Path $bakPath
Write-Host ""
Write-Host ("백업 생성: {0}" -f $bakPath) -ForegroundColor Green

# id → 결과 인덱스
$resultMap = @{}
foreach ($r in $results) { $resultMap[$r.id] = $r }

# 라인 단위 편집
# - tasks 배열 내부 task 객체는 4-space로 시작/종료
# - task의 마지막 필드는 항상 "notes" (사전 검증됨)
$lines = $rawJson -split "`r?`n"
$out   = New-Object System.Collections.ArrayList

$inTask         = $false
$currentTaskId  = $null
$buffer         = @()

$rxTaskStart = '^    \{$'
$rxTaskEnd   = '^    \},?$'
$rxId        = '^\s+"id":\s*"([^"]+)",?\s*$'
$rxNotes     = '^(\s+)"notes":\s*(".*")\s*$'

foreach ($line in $lines) {
  if (-not $inTask) {
    if ($line -match $rxTaskStart) {
      $inTask        = $true
      $currentTaskId = $null
      $buffer        = @($line)
    } else {
      [void]$out.Add($line)
    }
    continue
  }

  if ($line -match $rxId -and -not $currentTaskId) {
    $currentTaskId = $matches[1]
  }

  if ($line -match $rxTaskEnd) {
    $r = $resultMap[$currentTaskId]
    if ($null -eq $r -or $r.action -eq 'skip') {
      foreach ($b in $buffer) { [void]$out.Add($b) }
      [void]$out.Add($line)
    } else {
      $lastIdx  = $buffer.Count - 1
      $lastLine = $buffer[$lastIdx]
      if ($lastLine -notmatch $rxNotes) {
        Write-Host ("WARN: notes 라인을 찾지 못함 (id={0}). 원본 보존." -f $currentTaskId) -ForegroundColor Yellow
        foreach ($b in $buffer) { [void]$out.Add($b) }
        [void]$out.Add($line)
      } else {
        $indent       = $matches[1]
        $approvalJson = if ($r.approval_required) { 'true' } else { 'false' }
        $ownerLine    = ('{0}"owner": "{1}",' -f $indent, $r.owner)
        $approvalLine = ('{0}"approval_required": {1}' -f $indent, $approvalJson)
        for ($k = 0; $k -lt $lastIdx; $k++) { [void]$out.Add($buffer[$k]) }
        [void]$out.Add(("{0}," -f $lastLine))   # notes 라인 끝에 콤마 추가
        [void]$out.Add($ownerLine)
        [void]$out.Add($approvalLine)
        [void]$out.Add($line)
      }
    }

    $inTask        = $false
    $currentTaskId = $null
    $buffer        = @()
  } else {
    $buffer += $line
  }
}

# 라인엔딩 / 마지막 개행 보존
$lineEnding = if ($rawJson -match "`r`n") { "`r`n" } else { "`n" }
$newContent = ($out -join $lineEnding)
if ($rawJson.EndsWith("`n") -or $rawJson.EndsWith("`r`n")) {
  $newContent += $lineEnding
}

# UTF-8 BOM 없이 저장
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path $Path).Path, $newContent, $utf8NoBom)

# 적용 후 재파싱 검증
try {
  $verify = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  $okOwner    = ($verify.tasks | Where-Object { $_.PSObject.Properties.Name -contains 'owner' }).Count
  $okApproval = ($verify.tasks | Where-Object { $_.PSObject.Properties.Name -contains 'approval_required' }).Count
  Write-Host ""
  Write-Host "[APPLIED] tasks.json 수정 완료." -ForegroundColor Green
  Write-Host ("  적용 후 owner 보유 작업              : {0}/{1}" -f $okOwner,    $verify.tasks.Count)
  Write-Host ("  적용 후 approval_required 보유 작업  : {0}/{1}" -f $okApproval, $verify.tasks.Count)
  Write-Host ("  백업                                 : {0}" -f $bakPath)
} catch {
  Write-Host ""
  Write-Host "ERROR: 적용 후 JSON 파싱 실패. 백업으로 즉시 롤백 권장." -ForegroundColor Red
  Write-Host ("  복구: Copy-Item -Force '{0}' '{1}'" -f $bakPath, $Path) -ForegroundColor Red
  Write-Host ($_.Exception.Message) -ForegroundColor Red
  exit 1
}
