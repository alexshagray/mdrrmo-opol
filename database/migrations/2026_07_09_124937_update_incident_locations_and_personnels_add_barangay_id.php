<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\Barangay;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('incident_locations', function (Blueprint $table) {
            $table->unsignedBigInteger('barangay_id')->nullable()->after('barangay');
            $table->foreign('barangay_id')->references('id')->on('barangays')->onDelete('set null');
        });

        Schema::table('trained_personnels', function (Blueprint $table) {
            $table->unsignedBigInteger('barangay_id')->nullable()->after('barangay');
            $table->foreign('barangay_id')->references('id')->on('barangays')->onDelete('set null');
        });

        // Map existing string data to IDs
        $this->mapBarangays('incident_locations');
        $this->mapBarangays('trained_personnels');

        Schema::table('incident_locations', function (Blueprint $table) {
            $table->dropColumn('barangay');
        });

        Schema::table('trained_personnels', function (Blueprint $table) {
            $table->dropColumn('barangay');
        });
    }

    private function mapBarangays($tableName)
    {
        $records = DB::table($tableName)->whereNotNull('barangay')->get();
        
        foreach ($records as $record) {
            $name = trim($record->barangay);
            if (empty($name)) continue;

            $barangay = Barangay::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
            
            if (!$barangay) {
                // If it doesn't exist (e.g. they typed something random), we create it so we don't lose data
                $barangay = Barangay::create([
                    'name' => ucwords(strtolower($name))
                ]);
            }

            DB::table($tableName)->where('id', $record->id)->update([
                'barangay_id' => $barangay->id
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incident_locations', function (Blueprint $table) {
            $table->string('barangay')->nullable();
        });
        
        Schema::table('trained_personnels', function (Blueprint $table) {
            $table->string('barangay')->nullable();
        });

        $this->reverseMapBarangays('incident_locations');
        $this->reverseMapBarangays('trained_personnels');

        Schema::table('incident_locations', function (Blueprint $table) {
            $table->dropForeign(['barangay_id']);
            $table->dropColumn('barangay_id');
        });

        Schema::table('trained_personnels', function (Blueprint $table) {
            $table->dropForeign(['barangay_id']);
            $table->dropColumn('barangay_id');
        });
    }
    
    private function reverseMapBarangays($tableName)
    {
        $records = DB::table($tableName)->whereNotNull('barangay_id')->get();
        foreach ($records as $record) {
            $barangay = DB::table('barangays')->where('id', $record->barangay_id)->first();
            if ($barangay) {
                DB::table($tableName)->where('id', $record->id)->update([
                    'barangay' => $barangay->name
                ]);
            }
        }
    }
};
