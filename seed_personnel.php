<?php
$data = json_decode(file_get_contents(resource_path('js/data/trained_personnel.json')), true);
foreach ($data as $row) {
    \App\Models\TrainedPersonnel::create([
        'name' => $row['name'],
        'age' => $row['age'],
        'sex' => $row['sex'],
        'barangay' => $row['barangay']
    ]);
}
echo "Trained Personnel Seeded Successfully.\n";
