<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        \Illuminate\Support\Facades\DB::table('users')
            ->where('duty_status', 'Available')
            ->update(['duty_status' => 'online']);

        \Illuminate\Support\Facades\DB::table('users')
            ->whereNotIn('duty_status', ['online', 'offline'])
            ->update(['duty_status' => 'offline']);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('gps_enabled');
        });

        \Illuminate\Support\Facades\DB::statement("ALTER TABLE users MODIFY duty_status ENUM('offline', 'online') DEFAULT 'offline'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE users MODIFY duty_status VARCHAR(255) DEFAULT 'Available'");

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('gps_enabled')->default(false)->after('gender');
        });
    }
};
