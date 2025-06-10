<?php
header('Content-Type: application/json');
$pdga = intval($_GET['pdga_number'] ?? 0);
if (!$pdga) {
  echo json_encode([]);
  exit;
}

try {
  $pdo = new PDO(
    "mysql:host=localhost;dbname=sdev280capstone;charset=utf8mb4",
    "root",
    "",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['error' => 'DB connect failed']);
  exit;
}

$sql = "
  SELECT 
    s.stat_name,
    s.abbreviation,
    ROUND( SUM(erps.stat_count)/NULLIF(SUM(erps.opportunity_count),0)*100,1 ) AS value
  FROM event_round_player_stats erps
  JOIN event_rounds er   ON erps.event_round_id = er.event_round_id
  JOIN event_results eres
    ON er.pdga_event_id = eres.pdga_event_id
   AND eres.pdga_number = :pdga
  JOIN stats s           ON erps.stat_id      = s.stat_id
  WHERE erps.opportunity_count>0
  GROUP BY s.stat_id
  ORDER BY s.value_sort
";
$stmt = $pdo->prepare($sql);
$stmt->execute(['pdga' => $pdga]);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
