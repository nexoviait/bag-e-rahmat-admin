<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ \App\Models\Setting::where('key', 'company_name')->value('value') ?: 'Nexovia IT' }} - Unified Business Management Platform</title>

    <link rel="icon" type="image/x-icon" href="{{ \App\Models\Setting::where('key', 'favicon_path')->value('value') ? asset(\App\Models\Setting::where('key', 'favicon_path')->value('value')) : asset('favicon.ico') }}">

    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/App.jsx'])
</head>
<body class="antialiased m-0 p-0 bg-[#f8fafc] text-slate-800">
    <div id="root"></div>
</body>
</html>
