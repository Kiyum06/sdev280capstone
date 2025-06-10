<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost", "root", "", "sdev280capstone");
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "
    SELECT DISTINCT CONCAT(p.first_name, ' ', p.last_name) AS player_name, p.pdga_number
    FROM players p
    JOIN event_results er ON p.pdga_number = er.pdga_number
    WHERE er.event_rating IS NOT NULL
    ORDER BY player_name ASC
";

$result = $conn->query($sql);
$data = [];

while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);
$conn->close();
