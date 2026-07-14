<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Incident Reports</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11px;
            color: #333;
        }
        h1 {
            text-align: center;
            margin: 0;
            color: #111;
            font-size: 24px;
            text-transform: uppercase;
        }
        .header-sub {
            text-align: center;
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
        }
        .header-date {
            text-align: center;
            margin: 5px 0 30px 0;
            color: #888;
            font-size: 12px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        th, td {
            padding: 8px;
            border: 1px solid #ddd;
            text-align: left;
        }
        th {
            background-color: #f3f4f6;
            font-weight: bold;
        }
        .footer-sig {
            width: 200px;
            text-align: center;
            float: right;
            margin-top: 50px;
        }
        .footer-line {
            border-bottom: 1px solid #333;
            margin-bottom: 5px;
            height: 30px;
        }
        .footer-text {
            margin: 0;
            font-size: 11px;
            color: #555;
            font-weight: bold;
        }
        .status-badge {
            text-transform: uppercase;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Incident Reports</h1>
    <p class="header-sub">MDRRMO System Record</p>
    <p class="header-date">Generated on: {{ now()->format('M d, Y h:i A') }}</p>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Caller</th>
                <th>Emergency Type</th>
                <th>Responder</th>
                <th>Phone Number</th>
                <th>Location</th>
                <th>Date/Time</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($incidents as $inc)
                @php
                    $caller = $inc->user ? trim($inc->user->first_name . ' ' . $inc->user->last_name) : ($inc->caller_name ?? 'Unknown');
                    $type = $inc->emergencyType ? $inc->emergencyType->emergency_name : 'Not specified';
                    $phone = $inc->user ? $inc->user->phone_number : ($inc->caller_number ?? 'Unknown');
                    $loc = 'Not specified';
                    if ($inc->location) {
                        $loc = $inc->location->location ?? ($inc->location->barangayModel ? $inc->location->barangayModel->barangay_name : 'Unknown');
                    }
                    $responder = 'None';
                    if ($inc->responderLogs && $inc->responderLogs->first() && $inc->responderLogs->first()->responder) {
                        $responder = $inc->responderLogs->first()->responder->first_name . ' ' . $inc->responderLogs->first()->responder->last_name;
                    }
                @endphp
                <tr>
                    <td>{{ $inc->incident_id }}</td>
                    <td>{{ $caller }}</td>
                    <td>{{ $type }}</td>
                    <td>{{ $responder }}</td>
                    <td>{{ $phone }}</td>
                    <td>{{ $loc }}</td>
                    <td>{{ \Carbon\Carbon::parse($inc->created_at)->format('M d, Y h:i A') }}</td>
                    <td class="status-badge">{{ $inc->status }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div style="clear: both;"></div>
    <div class="footer-sig">
        <div class="footer-line"></div>
        <p class="footer-text">Prepared By</p>
    </div>
</body>
</html>
