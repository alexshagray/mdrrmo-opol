<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\EmergencyType;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('emergency_types', function (Blueprint $table) {
            $table->string('emoji_icon', 10)->default('🚨')->after('emergency_name');
            $table->string('color_hex', 7)->default('#a855f7')->after('emoji_icon');
        });

        // Backfill existing rows using the same smart keyword logic
        $keywords = [
            ['keywords' => ['medical', 'response', 'cardiac', 'heart', 'cpr'], 'emoji' => '🚑', 'color' => '#ef4444'],
            ['keywords' => ['rescue', 'search', 'mountain'], 'emoji' => '🚁', 'color' => '#3b82f6'],
            ['keywords' => ['fire', 'blaze', 'burn'], 'emoji' => '🔥', 'color' => '#f97316'],
            ['keywords' => ['flood', 'water', 'drown'], 'emoji' => '🌊', 'color' => '#0ea5e9'],
            ['keywords' => ['landslide', 'mudslide', 'collapse', 'earthquake', 'quake'], 'emoji' => '⛰️', 'color' => '#78716c'],
            ['keywords' => ['vehicular', 'accident', 'crash', 'car', 'road', 'collision'], 'emoji' => '🚗', 'color' => '#f59e0b'],
            ['keywords' => ['snake', 'animal', 'bite', 'rabies', 'insect'], 'emoji' => '🐍', 'color' => '#84cc16'],
            ['keywords' => ['power', 'electric', 'outage', 'electrocution'], 'emoji' => '⚡', 'color' => '#eab308'],
            ['keywords' => ['typhoon', 'storm', 'cyclone', 'hurricane', 'tornado', 'wind'], 'emoji' => '🌀', 'color' => '#6366f1'],
            ['keywords' => ['tsunami', 'tidal'], 'emoji' => '🌊', 'color' => '#0284c7'],
            ['keywords' => ['explosion', 'bomb', 'blast', 'chemical', 'hazmat'], 'emoji' => '💥', 'color' => '#dc2626'],
            ['keywords' => ['missing', 'person', 'missing person'], 'emoji' => '🔍', 'color' => '#8b5cf6'],
        ];

        EmergencyType::all()->each(function ($type) use ($keywords) {
            $name = strtolower($type->emergency_name);
            $emoji = '🚨';
            $color = '#a855f7';

            foreach ($keywords as $k) {
                foreach ($k['keywords'] as $kw) {
                    if (str_contains($name, $kw)) {
                        $emoji = $k['emoji'];
                        $color = $k['color'];
                        break 2;
                    }
                }
            }

            $type->update(['emoji_icon' => $emoji, 'color_hex' => $color]);
        });
    }

    public function down(): void
    {
        Schema::table('emergency_types', function (Blueprint $table) {
            $table->dropColumn(['emoji_icon', 'color_hex']);
        });
    }
};
