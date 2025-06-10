<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost", "root", "", "sdev280capstone");

$input = json_decode(file_get_contents("php://input"), true);
$pdga_number = intval($input["pdga_number"]);

$sql = "
    SELECT 
        CONCAT(p.first_name, ' ', p.last_name) AS player_name,
        e.start_date,
        er.event_rating
    FROM event_results er
    JOIN players p ON er.pdga_number = p.pdga_number
    JOIN events e ON er.pdga_event_id = e.pdga_event_id
    WHERE er.pdga_number = $pdga_number
    ORDER BY e.start_date ASC
";

$result = $conn->query($sql);
$data = [];

while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);
$conn->close();
