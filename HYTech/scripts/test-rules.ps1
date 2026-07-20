# Firestore security-rules verification matrix (run AFTER deploying rules).
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\test-rules.ps1 -ApiKey "AIza..."
# Signs in the seeded admin/trainer/student accounts and asserts an
# ALLOW/DENY matrix against the LIVE deployed rules (HTTP 403 = denied).
param([Parameter(Mandatory = $true)][string]$ApiKey)

$ErrorActionPreference = 'Stop'
$projectId = 'hyt-global-institute-lms'
$base = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents"
$script:pass = 0
$script:fail = 0

function Sign-In([string]$email, [string]$password) {
  $body = (@{ email = $email; password = $password; returnSecureToken = $true } | ConvertTo-Json)
  return Invoke-RestMethod -Method Post `
    -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$ApiKey" `
    -ContentType 'application/json' -Body $body
}

# Raw Firestore REST call; returns response, throws on HTTP error.
function Fs([string]$method, [string]$url, [string]$token, [string]$bodyJson) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  if ($bodyJson) {
    return Invoke-RestMethod -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $bodyJson
  } else {
    return Invoke-RestMethod -Method $method -Uri $url -Headers $headers
  }
}

function Test-Fs([string]$name, [string]$method, [string]$url, [string]$token, [string]$bodyJson, [int]$expected) {
  $status = 200
  try {
    $null = Fs $method $url $token $bodyJson
  } catch {
    try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = -1 }
  }
  if ($status -eq $expected) {
    $script:pass++
    Write-Host ("PASS  {0}  (HTTP {1})" -f $name, $status)
  } else {
    $script:fail++
    Write-Host ("FAIL  {0}  (expected {1}, got {2})" -f $name, $expected, $status) -ForegroundColor Red
  }
}

Write-Host '--- Signing in test accounts ---'
$admin    = Sign-In 'admin@hyt.com'    'admin1234'
$trainer  = Sign-In 'trainer@hyt.com'  'trainer1234'
$student  = Sign-In 'student1@hyt.com' 'student1234'
$student2 = Sign-In 'student2@hyt.com' 'student1234'
$aTok = $admin.idToken;    $aUid = $admin.localId
$tTok = $trainer.idToken;  $tUid = $trainer.localId
$sTok = $student.idToken;  $sUid = $student.localId
$s2Uid = $student2.localId
Write-Host "admin=$aUid trainer=$tUid student=$sUid student2=$s2Uid"

# Sanity: verify roles are what we assume (abort otherwise).
$adminDoc = Fs 'GET' "$base/users/$aUid" $aTok $null
if ($adminDoc.fields.role.stringValue -ne 'admin') { Write-Host 'ABORT: admin account role is not admin'; exit 1 }

Write-Host '--- Creating fixtures (as admin) ---'
$classBody = '{"fields":{"name":{"stringValue":"Rules Test Class"},"trainerId":{"stringValue":"' + $tUid + '"},"classCode":{"stringValue":"RULESTEST"},"status":{"stringValue":"Active"}}}'
$null = Fs 'PATCH' "$base/classes/rulesTestClass" $aTok $classBody
$otherClassBody = '{"fields":{"name":{"stringValue":"Other Trainer Class"},"trainerId":{"stringValue":"not-a-real-uid"},"status":{"stringValue":"Active"}}}'
$null = Fs 'PATCH' "$base/classes/rulesOtherClass" $aTok $otherClassBody
$null = Fs 'PATCH' "$base/classes/rulesTestClass/assessments/rulesTestAssessment" $aTok '{"fields":{"title":{"stringValue":"Rules Test Quiz"}}}'
$notifBody = '{"fields":{"toUid":{"stringValue":"' + $tUid + '"},"fromUid":{"stringValue":"' + $aUid + '"},"text":{"stringValue":"rules test"},"unread":{"booleanValue":true}}}'
$null = Fs 'PATCH' "$base/notifications/rulesTestNotif" $aTok $notifBody

Write-Host '--- Test matrix ---'

# users
Test-Fs 'T01 student sets own role=admin -> DENY'   'PATCH' "$base/users/${sUid}?updateMask.fieldPaths=role"   $sTok '{"fields":{"role":{"stringValue":"admin"}}}' 403
Test-Fs 'T02 student sets own status -> DENY'        'PATCH' "$base/users/${sUid}?updateMask.fieldPaths=status" $sTok '{"fields":{"status":{"stringValue":"Inactive"}}}' 403
Test-Fs 'T03 student edits own bio -> ALLOW'         'PATCH' "$base/users/${sUid}?updateMask.fieldPaths=bio"    $sTok '{"fields":{"bio":{"stringValue":"rules test bio"}}}' 200
Test-Fs 'T04 student edits ANOTHER user -> DENY'     'PATCH' "$base/users/${tUid}?updateMask.fieldPaths=bio"    $sTok '{"fields":{"bio":{"stringValue":"hacked"}}}' 403
Test-Fs 'T05 student reads trainer profile -> ALLOW' 'GET'   "$base/users/$tUid" $sTok $null 200
Test-Fs 'T06 unauthenticated read -> DENY'           'GET'   "$base/users/$sUid" $null $null 403
Test-Fs 'T07 admin changes student role -> ALLOW'    'PATCH' "$base/users/${sUid}?updateMask.fieldPaths=role"   $aTok '{"fields":{"role":{"stringValue":"student"}}}' 200

# classes
Test-Fs 'T08 trainer edits OWN class -> ALLOW'       'PATCH' "$base/classes/rulesTestClass?updateMask.fieldPaths=name"  $tTok '{"fields":{"name":{"stringValue":"Rules Test Class v2"}}}' 200
Test-Fs 'T09 trainer edits OTHER class -> DENY'      'PATCH' "$base/classes/rulesOtherClass?updateMask.fieldPaths=name" $tTok '{"fields":{"name":{"stringValue":"stolen"}}}' 403
Test-Fs 'T10 student edits a class -> DENY'          'PATCH' "$base/classes/rulesTestClass?updateMask.fieldPaths=name"  $sTok '{"fields":{"name":{"stringValue":"nope"}}}' 403
Test-Fs 'T11 student creates topic in class -> DENY' 'POST'  "$base/classes/rulesTestClass/topics" $sTok '{"fields":{"title":{"stringValue":"nope"}}}' 403

# sectors / course templates
Test-Fs 'T12 student creates sector -> DENY'         'POST' "$base/sectors" $sTok '{"fields":{"name":{"stringValue":"nope"}}}' 403
Test-Fs 'T13 trainer creates course template -> DENY' 'POST' "$base/courses" $tTok '{"fields":{"name":{"stringValue":"nope"}}}' 403

# announcements (student posts to class feed)
$annSelf = '{"fields":{"authorId":{"stringValue":"' + $sUid + '"},"message":{"stringValue":"hello class"}}}'
Test-Fs 'T36 student posts announcement as self -> ALLOW' 'POST' "$base/classes/rulesTestClass/announcements" $sTok $annSelf 200
$annOther = '{"fields":{"authorId":{"stringValue":"' + $tUid + '"},"message":{"stringValue":"forged"}}}'
Test-Fs 'T37 student posts announcement AS someone else -> DENY' 'POST' "$base/classes/rulesTestClass/announcements" $sTok $annOther 403

# enrollments
$enrollSelf = '{"fields":{"studentId":{"stringValue":"' + $sUid + '"},"classId":{"stringValue":"rulesTestClass"},"className":{"stringValue":"Rules Test Class"},"status":{"stringValue":"active"},"trainerId":{"stringValue":"' + $tUid + '"}}}'
$enrollDocName = ''
try {
  $resp = Fs 'POST' "$base/enrollments" $sTok $enrollSelf
  $enrollDocName = $resp.name
  $script:pass++; Write-Host 'PASS  T14 student self-enrolls -> ALLOW  (HTTP 200)'
} catch {
  $script:fail++; Write-Host 'FAIL  T14 student self-enrolls -> ALLOW (request denied)' -ForegroundColor Red
}
$enrollOther = '{"fields":{"studentId":{"stringValue":"' + $tUid + '"},"classId":{"stringValue":"rulesTestClass"},"status":{"stringValue":"active"}}}'
Test-Fs 'T15 student enrolls SOMEONE ELSE -> DENY' 'POST' "$base/enrollments" $sTok $enrollOther 403
$enrollGhost = '{"fields":{"studentId":{"stringValue":"' + $sUid + '"},"classId":{"stringValue":"nonexistent-class-xyz"},"status":{"stringValue":"active"}}}'
Test-Fs 'T40 student enrolls into NONEXISTENT class -> DENY' 'POST' "$base/enrollments" $sTok $enrollGhost 403
if ($enrollDocName) {
  $enrollUrl = "https://firestore.googleapis.com/v1/$enrollDocName"
  Test-Fs 'T16 student updates own progress -> ALLOW' 'PATCH' "${enrollUrl}?updateMask.fieldPaths=progress" $sTok '{"fields":{"progress":{"mapValue":{"fields":{"tasksCompleted":{"integerValue":"1"}}}}}}' 200
  Test-Fs 'T17 student sets own status=completed -> DENY' 'PATCH' "${enrollUrl}?updateMask.fieldPaths=status" $sTok '{"fields":{"status":{"stringValue":"completed"}}}' 403
  Test-Fs 'T18 student deletes own enrollment -> DENY' 'DELETE' $enrollUrl $sTok $null 403
  Test-Fs 'T19 class trainer updates enrollment status -> ALLOW' 'PATCH' "${enrollUrl}?updateMask.fieldPaths=status" $tTok '{"fields":{"status":{"stringValue":"completed"}}}' 200
  Test-Fs 'T20 admin deletes enrollment (cleanup) -> ALLOW' 'DELETE' $enrollUrl $aTok $null 200
}

# quiz attempts
$attemptSelf = '{"fields":{"studentId":{"stringValue":"' + $sUid + '"},"score":{"integerValue":"100"},"status":{"stringValue":"submitted"}}}'
$attemptDocName = ''
try {
  $resp = Fs 'POST' "$base/classes/rulesTestClass/assessments/rulesTestAssessment/attempts" $sTok $attemptSelf
  $attemptDocName = $resp.name
  $script:pass++; Write-Host 'PASS  T21 student submits own attempt -> ALLOW  (HTTP 200)'
} catch {
  $script:fail++; Write-Host 'FAIL  T21 student submits own attempt -> ALLOW (request denied)' -ForegroundColor Red
}
$attemptOther = '{"fields":{"studentId":{"stringValue":"' + $tUid + '"},"score":{"integerValue":"100"}}}'
Test-Fs 'T22 student submits attempt AS someone else -> DENY' 'POST' "$base/classes/rulesTestClass/assessments/rulesTestAssessment/attempts" $sTok $attemptOther 403
if ($attemptDocName) {
  $attemptUrl = "https://firestore.googleapis.com/v1/$attemptDocName"
  Test-Fs 'T23 student edits submitted attempt score -> DENY (immutable)' 'PATCH' "${attemptUrl}?updateMask.fieldPaths=score" $sTok '{"fields":{"score":{"integerValue":"0"}}}' 403
  Test-Fs 'T24 trainer edits an attempt -> DENY (immutable)' 'PATCH' "${attemptUrl}?updateMask.fieldPaths=score" $tTok '{"fields":{"score":{"integerValue":"0"}}}' 403
  Test-Fs 'T25 admin deletes attempt (cleanup) -> ALLOW' 'DELETE' $attemptUrl $aTok $null 200
}

# notifications
Test-Fs 'T26 student reads someone else notification -> DENY' 'GET' "$base/notifications/rulesTestNotif" $sTok $null 403
Test-Fs 'T27 recipient reads own notification -> ALLOW' 'GET' "$base/notifications/rulesTestNotif" $tTok $null 200
Test-Fs 'T28 student edits someone else notification -> DENY' 'PATCH' "$base/notifications/rulesTestNotif?updateMask.fieldPaths=unread" $sTok '{"fields":{"unread":{"booleanValue":false}}}' 403
Test-Fs 'T29 recipient marks read (unread only) -> ALLOW' 'PATCH' "$base/notifications/rulesTestNotif?updateMask.fieldPaths=unread" $tTok '{"fields":{"unread":{"booleanValue":false}}}' 200
Test-Fs 'T30 recipient edits notification TEXT -> DENY' 'PATCH' "$base/notifications/rulesTestNotif?updateMask.fieldPaths=text" $tTok '{"fields":{"text":{"stringValue":"forged"}}}' 403
$spoofNotif = '{"fields":{"toUid":{"stringValue":"' + $tUid + '"},"fromUid":{"stringValue":"' + $aUid + '"},"text":{"stringValue":"spoof"},"unread":{"booleanValue":true}}}'
Test-Fs 'T31 student sends notification spoofing fromUid -> DENY' 'POST' "$base/notifications" $sTok $spoofNotif 403
# Student may only notify staff, not other students (anti phishing-blast).
$toStudent = '{"fields":{"toUid":{"stringValue":"' + $s2Uid + '"},"fromUid":{"stringValue":"' + $sUid + '"},"text":{"stringValue":"spam"},"unread":{"booleanValue":true}}}'
Test-Fs 'T38 student notifies ANOTHER STUDENT -> DENY' 'POST' "$base/notifications" $sTok $toStudent 403
$toTrainer = '{"fields":{"toUid":{"stringValue":"' + $tUid + '"},"fromUid":{"stringValue":"' + $sUid + '"},"text":{"stringValue":"please add me"},"unread":{"booleanValue":true}}}'
Test-Fs 'T39 student notifies a TRAINER -> ALLOW' 'POST' "$base/notifications" $sTok $toTrainer 200

# activity logs
$logSelf = '{"fields":{"userId":{"stringValue":"' + $sUid + '"},"action":{"stringValue":"rules_test"},"entityType":{"stringValue":"test"},"entityId":{"stringValue":"t"}}}'
Test-Fs 'T32 student logs own activity -> ALLOW' 'POST' "$base/activityLogs" $sTok $logSelf 200
$logOther = '{"fields":{"userId":{"stringValue":"' + $tUid + '"},"action":{"stringValue":"forged"}}}'
Test-Fs 'T33 student logs AS someone else -> DENY' 'POST' "$base/activityLogs" $sTok $logOther 403
$q = '{"structuredQuery":{"from":[{"collectionId":"activityLogs"}],"limit":5}}'
Test-Fs 'T34 student lists ALL activity logs -> DENY' 'POST' "${base}:runQuery" $sTok $q 403
Test-Fs 'T35 admin lists ALL activity logs -> ALLOW' 'POST' "${base}:runQuery" $aTok $q 200

Write-Host '--- Cleanup (as admin) ---'
try { $null = Fs 'DELETE' "$base/classes/rulesTestClass/assessments/rulesTestAssessment" $aTok $null } catch {}
try { $null = Fs 'DELETE' "$base/classes/rulesTestClass" $aTok $null } catch {}
try { $null = Fs 'DELETE' "$base/classes/rulesOtherClass" $aTok $null } catch {}
try { $null = Fs 'DELETE' "$base/notifications/rulesTestNotif" $aTok $null } catch {}

Write-Host ''
Write-Host ("RESULT: {0} passed, {1} failed" -f $script:pass, $script:fail)
if ($script:fail -gt 0) { exit 1 } else { exit 0 }
