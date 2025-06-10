<?php
$connection = new mysqli("localhost", "root", "", "sdev280capstone");
if ($connection->connect_error) {
    die("Connection failed: " . $connection->connect_error);
}

// Get last 5 events by date
$eventQuery = "
    SELECT pdga_event_id, name
    FROM events
    ORDER BY start_date DESC
    LIMIT 5
";
$eventResult = $connection->query($eventQuery);

$events = [];
$eventIds = [];

while ($row = $eventResult->fetch_assoc()) {
    $events[] = $row['name'];
    $eventIds[] = $row['pdga_event_id'];
}

// Get top 5 players based on total_score across all 5 events
$playerQuery = "
    SELECT er.pdga_number, p.first_name, p.last_name, SUM(er.total_score) AS total
    FROM event_results er
    JOIN players p ON er.pdga_number = p.pdga_number
    WHERE er.pdga_event_id IN (" . implode(',', array_map('intval', $eventIds)) . ")
    GROUP BY er.pdga_number
    ORDER BY total ASC
    LIMIT 5
";
$playerResult = $connection->query($playerQuery);

$players = [];
while ($row = $playerResult->fetch_assoc()) {
    $players[] = [
        "pdga_number" => $row["pdga_number"],
        "player_name" => $row["first_name"] . " " . $row["last_name"]
    ];
}

// For each player, get scores per event
$data = [];
foreach ($players as $player) {
    $scoreQuery = "
        SELECT e.name, er.total_score
        FROM event_results er
        JOIN events e ON er.pdga_event_id = e.pdga_event_id
        WHERE er.pdga_number = {$player['pdga_number']}
          AND er.pdga_event_id IN (" . implode(',', array_map('intval', $eventIds)) . ")
        ORDER BY e.start_date DESC
    ";
    $scoreResult = $connection->query($scoreQuery);

    $scores = [];
    while ($row = $scoreResult->fetch_assoc()) {
        $scores[$row['name']] = (int)$row['total_score'];
    }

    $data[] = [
        "player_name" => $player['player_name'],
        "pdga_number" => $player['pdga_number'],
        "scores" => array_values(array_replace(array_fill_keys($events, null), $scores))
    ];
}

echo json_encode([
    "events" => array_reverse($events),
    "players" => $data
]);
