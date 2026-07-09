<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrainedPersonnel extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'age', 'sex', 'barangay_id'];
    
    protected $appends = ['barangay'];
    public function barangayModel()
    {
        return $this->belongsTo(Barangay::class, 'barangay_id');
    }

    public function getBarangayAttribute()
    {
        return $this->barangayModel ? $this->barangayModel->name : null;
    }
}
