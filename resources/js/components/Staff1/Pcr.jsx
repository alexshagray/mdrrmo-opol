import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function Pcr({ setNotifications }) {
  const [pcrPage, setPcrPage] = useState(1);
  const [selectedPcr, setSelectedPcr] = useState(null);
  const queryClient = useQueryClient();

  const { data: pcrData, isLoading } = useQuery({
    queryKey: ['pcrReports', pcrPage],
    queryFn: async () => {
      const response = await fetch(`/api/patient_care_reports?page=${pcrPage}`);
      return response.json();
    }
  });

  const pcrReports = pcrData?.data || [];

  const deletePcrMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/patient_care_reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to delete PCR');
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcrReports'] });
      setNotifications(prev => [{
        id: Date.now(),
        title: 'PCR Deleted',
        message: `Patient Care Record has been permanently removed.`,
        type: 'system',
        created_at: new Date().toISOString()
      }, ...prev]);
    },
    onError: (err) => alert(err.message)
  });

  const handleDeletePcr = async (id) => {
    if (window.confirm('Are you sure you want to delete this Patient Care Record? This action cannot be undone.')) {
      deletePcrMutation.mutate(id);
    }
  };

  const editPcrMutation = useMutation({
    mutationFn: async ({ report, newName, newStatus }) => {
      const response = await fetch(`/api/patient_care_reports/${report.id || report.incident_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          full_name: newName,
          status: newStatus
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to update PCR');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pcrReports'] });
      setNotifications(prev => [{
        id: Date.now(),
        title: 'PCR Updated',
        message: `Patient Care Record has been updated.`,
        type: 'system',
        created_at: new Date().toISOString()
      }, ...prev]);
    },
    onError: (err) => alert(err.message)
  });

  const handleEditPcr = async (report) => {
    const newName = window.prompt("Edit Patient Name:", report.full_name || report.patient_name || '');
    if (newName === null) return;
    
    const newStatus = window.prompt("Edit Status (e.g. active, completed, pending):", report.status || '');
    if (newStatus === null) return;

    editPcrMutation.mutate({ report, newName, newStatus });
  };

  const generatePcrPdf = (pcr) => {
    if (!window.html2pdf) {
      alert("PDF library is loading, please try again in a moment.");
      return;
    }

    const personal = pcr.pcr_data?.personal || {
      age: pcr.pcr_data?.step1?.patientAge,
      gender: pcr.pcr_data?.step1?.patientGender,
      contact_number: pcr.pcr_data?.step1?.patientContact,
      address: pcr.pcr_data?.step1?.patientAddress,
      civil_status: pcr.pcr_data?.step1?.patientCivilStatus,
      emergency_type: pcr.pcr_data?.step1?.chiefComplaint
    };
    const dispatch = pcr.pcr_data?.dispatch_info || {
      caller_phone: pcr.pcr_data?.step1?.callerNumber,
      caller_address: pcr.pcr_data?.step1?.placeOfIncident,
      dispatch_time: pcr.pcr_data?.step2?.dispatchTime,
      en_route_time: pcr.pcr_data?.step2?.enRouteTime
    };
    const medical = pcr.pcr_data?.medical || pcr.pcr_data?.step4 || {};
    const injuries = pcr.pcr_data?.injuries || (pcr.pcr_data?.step3?.selectedInjuries || []).reduce((acc, inj) => ({...acc, [inj.toLowerCase()]: true}), {});
    if (pcr.pcr_data?.step3?.injuryDetails) injuries.description = pcr.pcr_data.step3.injuryDetails;
    const treatment = pcr.pcr_data?.treatment || {};
    const transport = pcr.pcr_data?.transport || pcr.pcr_data?.step2 || pcr.pcr_data?.step6 || {};
    const signatures = pcr.pcr_data?.signatures || pcr.pcr_data?.step6 || pcr.pcr_data?.step7 || {};
    const natureOfCall = pcr.pcr_data?.step1?.natureOfCall || '';

    const element = document.createElement('div');
    element.style.padding = '0';
    element.style.color = '#111';
    element.style.backgroundColor = '#ffffff';
    element.style.fontFamily = '"Plus Jakarta Sans", "Helvetica Neue", sans-serif';
    element.style.fontSize = '12px';
    element.style.lineHeight = '1.6';

    element.innerHTML = `
      <div style="padding: 10px; width: 100%; box-sizing: border-box;">
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; border: 1px solid #000; color: #000;">
        <!-- HEADER -->
        <tr>
          <td colspan="4" style="text-align: center; border-bottom: 1px solid #000; padding: 10px; position: relative;">
            <img src="/images/mdrrmo_logo.png" style="position: absolute; top: 10px; right: 20px; width: 50px; height: 50px;" onerror="this.style.display='none'" />
            <h3 style="margin: 0; font-weight: normal; font-size: 13px;">LOCAL DISASTER RISK REDUCTION MANAGEMENT OFFICE</h3>
            <h2 style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">PATIENT CARE RECORD</h2>
          </td>
        </tr>
        
        <!-- PATIENT INFO SECTION -->
        <tr>
          <td colspan="4" style="background-color: #e0e0e0; border-bottom: 1px solid #000; padding: 2px 5px; font-weight: bold;">
            Patient Information
          </td>
        </tr>
        
        <tr>
          <td style="width: 15%; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Name of Patient</td>
          <td style="width: 50%; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px; text-transform: uppercase;">${pcr.full_name || pcr.patient_name || ''}</td>
          <td style="width: 15%; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Date (mo/day/yr)</td>
          <td style="width: 20%; border-bottom: 1px solid #000; padding: 2px 5px;">${pcr.created_at ? new Date(pcr.created_at).toLocaleDateString('en-US', {month:'2-digit', day:'2-digit', year:'numeric'}) : ''}</td>
        </tr>
        
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Contact #</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">
            <span style="display: inline-block; width: 130px;">${pcr.contact_number || personal.contact_number || ''}</span>
            | Age: <span style="display: inline-block; width: 30px; text-align: center;">${personal.age || ''}</span> 
            | <span style="font-size: 10px;">Male</span> <input type="checkbox" ${personal.gender?.toLowerCase() === 'male' ? 'checked' : ''}> 
            <span style="font-size: 10px;">Female</span> <input type="checkbox" ${personal.gender?.toLowerCase() === 'female' ? 'checked' : ''}>
          </td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Caller #</td>
          <td style="border-bottom: 1px solid #000; padding: 2px 5px;">${dispatch.caller_phone || ''}</td>
        </tr>
        
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Civil Status</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px; font-size: 10px;">
            <input type="checkbox" ${personal.civil_status === 'Single' ? 'checked' : ''}> Single 
            <input type="checkbox" ${personal.civil_status === 'Married' ? 'checked' : ''}> Married 
            <input type="checkbox" ${personal.civil_status === 'Widowed' ? 'checked' : ''}> Widowed 
            <input type="checkbox" ${personal.civil_status === 'Child' ? 'checked' : ''}> Child 
            <input type="checkbox" ${personal.civil_status === 'Separated' ? 'checked' : ''}> Separated
          </td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Dispatch Time</td>
          <td style="border-bottom: 1px solid #000; padding: 2px 5px;">${dispatch.dispatch_time || ''}</td>
        </tr>
        
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Address</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">${pcr.address || personal.address || ''}</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">En Route Time</td>
          <td style="border-bottom: 1px solid #000; padding: 2px 5px;">${dispatch.en_route_time || ''}</td>
        </tr>
        
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Place of Incident</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">${dispatch.caller_address || pcr.address || ''}</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">On Scene Time</td>
          <td style="border-bottom: 1px solid #000; padding: 2px 5px;">${transport.arrival_time || ''}</td>
        </tr>
        
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Chief of Complaint</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">${pcr.emergency_type?.name || (typeof pcr.emergency_type === 'string' ? pcr.emergency_type : '') || personal.emergency_type || ''}</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Transport Time</td>
          <td style="border-bottom: 1px solid #000; padding: 2px 5px;">${transport.transport_time || ''}</td>
        </tr>
        
        <tr>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px;">Nature of Call</td>
          <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px; font-size: 10px;">
            <input type="checkbox" ${natureOfCall === 'Emergency' ? 'checked' : ''}> Emergency &nbsp;
            <input type="checkbox" ${natureOfCall === 'Transport' ? 'checked' : ''}> Transport &nbsp;
            <input type="checkbox" ${natureOfCall === 'Standby' ? 'checked' : ''}> Standby <br>
            <input type="checkbox" ${natureOfCall === 'Non-Emergency' ? 'checked' : ''}> Non-Emergency &nbsp;
            <input type="checkbox" ${natureOfCall === 'Medical Assistance' ? 'checked' : ''}> Medical Assistance
          </td>
          <td colspan="2" style="padding: 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 5px; width: 42.8%;">Arrived HF</td>
                <td style="border-bottom: 1px solid #000; padding: 2px 5px;">${transport.arrived_hf || ''}</td>
              </tr>
              <tr>
                <td style="border-right: 1px solid #000; padding: 2px 5px;">Departed HF</td>
                <td style="padding: 2px 5px;">${transport.departed_hf || ''}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- TWO COLUMNS: ASSESSMENT AND VITALS -->
        <tr>
          <td colspan="4" style="padding: 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <!-- LEFT COLUMN -->
                <td style="width: 50%; border-right: 1px solid #000; vertical-align: top; padding: 0;">
                  <!-- Assessment Title -->
                  <div style="background: #e0e0e0; padding: 2px 5px; font-weight: bold; border-bottom: 1px solid #000;">ASSESSMENT</div>
                  
                  <!-- Injuries Grid -->
                  <div style="padding: 5px; font-size: 10px;">
                    <table style="width: 100%; border: none;">
                      <tr>
                        <td><input type="checkbox" ${injuries.abrasion ? 'checked' : ''}> Abrasion</td>
                        <td><input type="checkbox" ${injuries.contusion ? 'checked' : ''}> Contusion</td>
                        <td><input type="checkbox" ${injuries.laceration ? 'checked' : ''}> Laceration</td>
                      </tr>
                      <tr>
                        <td><input type="checkbox" ${injuries.amputation ? 'checked' : ''}> Amputation</td>
                        <td><input type="checkbox" ${injuries.fractured ? 'checked' : ''}> Fractured</td>
                        <td><input type="checkbox" ${injuries.punctured ? 'checked' : ''}> Punctured</td>
                      </tr>
                      <tr>
                        <td><input type="checkbox" ${injuries.avulsion ? 'checked' : ''}> Avulsion</td>
                        <td><input type="checkbox" ${injuries.hematoma ? 'checked' : ''}> Hematoma</td>
                        <td><input type="checkbox" ${injuries.swelling ? 'checked' : ''}> Swelling</td>
                      </tr>
                      <tr>
                        <td><input type="checkbox" ${injuries.burns ? 'checked' : ''}> Burns</td>
                        <td><input type="checkbox" ${injuries.incision ? 'checked' : ''}> Incision</td>
                        <td><input type="checkbox" ${injuries.tenderness ? 'checked' : ''}> Tenderness</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Body Map Image -->
                  <div style="text-align: center; padding: 5px; min-height: 120px; position: relative;">
                    <div style="width: 80%; height: 100px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                        <img src="/images/body_diagram.png" style="max-height: 100px; max-width: 100%; object-fit: contain;" alt="Body Diagram" onerror="this.style.display='none'" />
                    </div>
                    <div style="display: flex; justify-content: space-around; font-weight: bold; font-size: 9px; margin-top: 5px;">
                        <span>FRONT</span>
                        <span>BACK</span>
                    </div>
                  </div>

                  <!-- Special Instructions -->
                  <div style="border-top: 1px solid #000; padding: 5px;">
                    <strong>SPECIAL INSTRUCTIONS:</strong>
                    <div style="min-height: 40px; padding: 5px; border-bottom: 1px solid #999; margin-top: 5px;">${treatment.notes || ''}</div>
                    <div style="min-height: 20px; border-bottom: 1px solid #999;"></div>
                    <div style="min-height: 20px; border-bottom: 1px solid #999;"></div>
                  </div>
                  
                  <!-- Incident Disposition -->
                  <div style="background: #e0e0e0; padding: 2px 5px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000;">INCIDENT/PATIENT DISPOSITION</div>
                  <div style="padding: 5px; font-size: 9px;">
                    <table style="width: 100%;">
                      <tr>
                        <td><input type="checkbox"> Treated, Recovered</td>
                        <td><input type="checkbox"> False Call</td>
                      </tr>
                      <tr>
                        <td><input type="checkbox"> Treated, Transported to Hospital</td>
                        <td><input type="checkbox"> Cancelled</td>
                      </tr>
                      <tr>
                        <td><input type="checkbox"> Treated, Transferred Care to RHU</td>
                        <td><input type="checkbox"> No Patient Found</td>
                      </tr>
                      <tr>
                        <td><input type="checkbox"> Treated, Transported by Private Veh.</td>
                        <td><input type="checkbox"> Dead at Scene</td>
                      </tr>
                      <tr>
                        <td><input type="checkbox"> Treated, Refused Transport</td>
                        <td><input type="checkbox"> Patient Refused Care</td>
                      </tr>
                      <tr>
                        <td><input type="checkbox"> No Treatment, Transport Required</td>
                        <td><input type="checkbox"> No Treatment Required</td>
                      </tr>
                    </table>
                  </div>
                </td>
                
                <!-- RIGHT COLUMN -->
                <td style="width: 50%; vertical-align: top; padding: 0;">
                  <!-- Vital Signs Title -->
                  <div style="background: #e0e0e0; padding: 2px 5px; font-weight: bold; border-bottom: 1px solid #000;">VITAL SIGNS</div>
                  
                  <table style="width: 100%; border-collapse: collapse; text-align: center;">
                    <tr>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;"></td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-weight: bold;">1ST TAKE</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-weight: bold;">2ND</td>
                      <td style="border-bottom: 1px solid #000; padding: 4px; font-weight: bold;">3RD</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">TIME</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[0] ? medical.vitals[0].time : ''}</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[1] ? medical.vitals[1].time : ''}</td>
                      <td style="border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[2] ? medical.vitals[2].time : ''}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">O2 SAT</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[0] ? medical.vitals[0].o2 : medical.oxygen || ''}</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[1] ? medical.vitals[1].o2 : ''}</td>
                      <td style="border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[2] ? medical.vitals[2].o2 : ''}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">PR/HR</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[0] ? medical.vitals[0].pr : medical.pulse_rate || ''}</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[1] ? medical.vitals[1].pr : ''}</td>
                      <td style="border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[2] ? medical.vitals[2].pr : ''}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">RR</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[0] ? medical.vitals[0].rr : ''}</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[1] ? medical.vitals[1].rr : ''}</td>
                      <td style="border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[2] ? medical.vitals[2].rr : ''}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">BP</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[0] ? medical.vitals[0].bp : medical.blood_pressure || ''}</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[1] ? medical.vitals[1].bp : ''}</td>
                      <td style="border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[2] ? medical.vitals[2].bp : ''}</td>
                    </tr>
                    <tr>
                      <td style="font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">TEMP</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[0] ? medical.vitals[0].temp : medical.temperature || ''}</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[1] ? medical.vitals[1].temp : ''}</td>
                      <td style="border-bottom: 1px solid #000; padding: 4px;">${medical.vitals && medical.vitals[2] ? medical.vitals[2].temp : ''}</td>
                    </tr>
                  </table>
                  
                  <!-- GCS -->
                  <div style="background: #e0e0e0; padding: 2px 5px; font-weight: bold; border-bottom: 1px solid #000; margin-top: 10px;">GLASSCOW COMA SCALE</div>
                  <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                    <tr>
                      <td style="width: 40%; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px; vertical-align: top;">Best eye response (E)</td>
                      <td style="width: 50%; border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px;">
                        Spontaneous (4)<br>
                        To verbal command (3)<br>
                        To pain (2)<br>
                        None (1)
                      </td>
                      <td style="width: 10%; border-bottom: 1px solid #000; padding: 2px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 12px;">${medical.gcs_eye || ''}</td>
                    </tr>
                    <tr>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px; vertical-align: top;">Best verbal response (V)</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px;">
                        Oriented (5)<br>
                        Confused (4)<br>
                        Inappropriate words (3)<br>
                        Incomprehensible sounds (2)<br>
                        None (1)
                      </td>
                      <td style="border-bottom: 1px solid #000; padding: 2px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 12px;">${medical.gcs_verbal || ''}</td>
                    </tr>
                    <tr>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px; vertical-align: top;">Best motor response (M)</td>
                      <td style="border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 2px;">
                        Obeys commands (6)<br>
                        Purposeful movement (5)<br>
                        Withdraws from pain (4)<br>
                        Abnormal flexion (3)<br>
                        Extensor response (2)<br>
                        None (1)
                      </td>
                      <td style="border-bottom: 1px solid #000; padding: 2px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 12px;">${medical.gcs_motor || ''}</td>
                    </tr>
                    <tr>
                      <td colspan="2" style="text-align: right; font-weight: bold; padding: 4px; border-right: 1px solid #000; border-bottom: 1px solid #000;">TOTAL</td>
                      <td style="border-bottom: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 14px;">${(medical.gcs_eye && medical.gcs_verbal && medical.gcs_motor) ? (medical.gcs_eye + medical.gcs_verbal + medical.gcs_motor) : ''}</td>
                    </tr>
                  </table>

                  <!-- Responders Section -->
                  <div style="padding: 15px 10px;">
                    <div style="margin-bottom: 15px;">
                        <strong>Responders:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; width: 80%;">${signatures.responder || ''}</span>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <strong>Transported to:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; width: 75%;">${transport.to || ''}</span>
                    </div>
                    <div>
                        <strong>Received by:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; width: 75%;">${signatures.receiving_staff || ''}</span>
                    </div>
                  </div>
                  
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- WAIVER SECTION -->
        <tr>
          <td colspan="4" style="background: #e0e0e0; padding: 2px 5px; font-weight: bold; border-top: 1px solid #000; text-align: center;">WAIVER</td>
        </tr>
        <tr>
          <td colspan="4" style="padding: 10px; border-top: 1px solid #000;">
            By signing this form, I <span style="border-bottom: 1px solid #000; display: inline-block; width: 250px; text-align: center;">${signatures.waiver_name || ''}</span> is releasing OPOL RESCUE TEAM of any liability and/or medical claim resulting from my decision to refuse care against medical advice.
            <br><br><br>
            <table style="width: 100%; border: none;">
              <tr>
                <td style="width: 50%;">
                  <strong>SIGNATURE:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; width: 200px;"></span><br><br>
                  <strong>DATE:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; width: 200px;"></span>
                </td>
                <td style="width: 50%;">
                  <div style="text-align: center; font-weight: bold; margin-bottom: 15px;">WITNESS INFORMATION</div>
                  <strong>NAME:</strong> <span style="border-bottom: 1px solid #000; display: inline-block; width: 200px;">${signatures.witness_name || ''}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      </div>
    `;

    const opt = {
      margin:       0.2,
      filename:     `PCR_${pcr.incident_id || pcr.id || 'document'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    window.html2pdf().from(element).set(opt).save();
  };

  if (isLoading && pcrReports.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-[#0a84ff]/30 border-t-[#0a84ff] rounded-full animate-spin"></div>
        <span className="ml-3 text-gray-400 font-medium">Loading records...</span>
      </div>
    );
  }
  const currentPatientName = selectedPcr?.full_name || selectedPcr?.patient_name;
  const relatedPcrs = pcrReports.filter(p => 
    (p.full_name || p.patient_name) && 
    (p.full_name || p.patient_name).toLowerCase() === (currentPatientName || '').toLowerCase()
  );
  const currentIndex = selectedPcr ? relatedPcrs.findIndex(p => p.id === selectedPcr.id) : -1;
  const hasNewer = currentIndex > 0;
  const hasOlder = currentIndex >= 0 && currentIndex < relatedPcrs.length - 1;

  return (
    <>
      <div className="bg-[#111116] border border-white/10 rounded-2xl p-6 shadow-lg mb-6">
        <h2 className="text-white text-xl font-bold mb-6 flex items-center gap-3">
          <span className="p-2 bg-[#0a84ff]/20 text-[#0a84ff] rounded-lg">📋</span>
          Manage Patient Care Records
        </h2>
        {pcrReports.length === 0 ? (
          <p className="text-gray-400 text-center py-8 bg-white/5 rounded-xl border border-white/10">No patient care records found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-white/10 text-gray-400 font-semibold text-sm uppercase tracking-wider bg-white/5 rounded-tl-xl">Patient Name</th>
                  <th className="p-4 border-b border-white/10 text-gray-400 font-semibold text-sm uppercase tracking-wider bg-white/5">Emergency Type</th>
                  <th className="p-4 border-b border-white/10 text-gray-400 font-semibold text-sm uppercase tracking-wider bg-white/5">Contact Number</th>
                  <th className="p-4 border-b border-white/10 text-gray-400 font-semibold text-sm uppercase tracking-wider bg-white/5">Status</th>
                  <th className="p-4 border-b border-white/10 text-gray-400 font-semibold text-sm uppercase tracking-wider bg-white/5 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pcrReports.map((report) => (
                  <tr key={report.id || report.incident_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-medium">{report.full_name || report.patient_name || 'Unknown'}</td>
                    <td className="p-4 text-gray-300">
                      <span style={{ color: report.emergency_type?.color_hex || '#d1d5db' }}>
                        {report.emergency_type?.emoji_icon} {report.emergency_type?.name || (typeof report.emergency_type === 'string' ? report.emergency_type : 'Unknown')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">{report.contact_number || report.caller_number}</td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        report.status?.toLowerCase() === 'completed' || report.status?.toLowerCase() === 'resolved' ? 'bg-[#34c759]/20 text-[#34c759] border border-[#34c759]/30' : 
                        report.status?.toLowerCase() === 'active' || report.status?.toLowerCase() === 'in progress' ? 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30' : 
                        'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2">
                      <button 
                        className="bg-white/10 hover:bg-[#0a84ff] text-white hover:text-white border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        onClick={() => setSelectedPcr(report)}
                      >
                        📋 View
                      </button>
                      <button 
                        className="bg-[#34c759]/10 border border-[#34c759]/30 hover:bg-[#34c759]/20 text-[#34c759] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5" 
                        onClick={() => handleEditPcr(report)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="bg-[#ef4444]/10 border border-[#ef4444]/30 hover:bg-[#ef4444]/20 text-[#ef4444] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5" 
                        onClick={() => handleDeletePcr(report.id || report.incident_id)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pcrData?.last_page > 1 && (
          <div className="flex justify-between items-center mt-5 p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-gray-400 text-sm">
              Showing page <strong className="text-white">{pcrData.current_page}</strong> of <strong className="text-white">{pcrData.last_page}</strong>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={!pcrData.prev_page_url}
                onClick={() => setPcrPage(p => Math.max(1, p - 1))}
                className={`px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-medium transition-colors ${!pcrData.prev_page_url ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}`}
              >
                Previous
              </button>
              <button 
                disabled={!pcrData.next_page_url}
                onClick={() => setPcrPage(p => p + 1)}
                className={`px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white font-medium transition-colors ${!pcrData.next_page_url ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {selectedPcr && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedPcr(null)}>
            <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-white m-0">Patient Care Report Details</h2>
                  
                  {/* Patient History Navigation */}
                  {relatedPcrs.length > 1 && (
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/10 ml-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (hasNewer) setSelectedPcr(relatedPcrs[currentIndex - 1]); }}
                        disabled={!hasNewer}
                        className={`px-3 py-1.5 bg-transparent border-none text-white ${!hasNewer ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'} transition-colors`}
                        title="View Newer Record"
                      >
                        ◀
                      </button>
                      <span className="text-xs text-gray-400 font-bold px-2 border-x border-white/10 py-1.5">
                        {currentIndex + 1} of {relatedPcrs.length}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (hasOlder) setSelectedPcr(relatedPcrs[currentIndex + 1]); }}
                        disabled={!hasOlder}
                        className={`px-3 py-1.5 bg-transparent border-none text-white ${!hasOlder ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'} transition-colors`}
                        title="View Older Record"
                      >
                        ▶
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 items-center">
                  <button 
                    className="bg-[#ef4444] hover:bg-[#dc2626] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg"
                    onClick={() => generatePcrPdf(selectedPcr)}
                  >
                    <span>📄</span> Download PDF
                  </button>
                  <button className="bg-transparent border-none text-gray-400 hover:text-white text-xl cursor-pointer p-2 leading-none rounded-full transition-colors" onClick={() => setSelectedPcr(null)}>✕</button>
                </div>
              </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-bold text-base mb-4 border-b border-white/10 pb-2">Patient Care Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">PCR ID</span>
                    <strong className="text-white text-sm">{selectedPcr.incident_id || selectedPcr.id || 'Not specified'}</strong>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Patient Name</span>
                    <strong className="text-white text-sm">{selectedPcr.full_name || selectedPcr.patient_name || 'Unknown'}</strong>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Age / Sex / Civil Status</span>
                    <strong className="text-white text-sm">{selectedPcr.pcr_data?.personal?.age || selectedPcr.pcr_data?.step1?.patientAge || 'N/A'} / {selectedPcr.pcr_data?.personal?.gender || selectedPcr.pcr_data?.step1?.patientGender || 'N/A'} / {selectedPcr.pcr_data?.personal?.civil_status || selectedPcr.pcr_data?.step1?.patientCivilStatus || 'N/A'}</strong>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5 md:col-span-2">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Vital Signs (Takes)</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-gray-500 border-b border-white/10">
                            <th className="pb-2 font-normal">Take</th>
                            <th className="pb-2 font-normal">Time</th>
                            <th className="pb-2 font-normal">BP</th>
                            <th className="pb-2 font-normal">PR/HR</th>
                            <th className="pb-2 font-normal">SpO2</th>
                            <th className="pb-2 font-normal">RR</th>
                            <th className="pb-2 font-normal">Temp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPcr.pcr_data?.medical?.vitals ? selectedPcr.pcr_data.medical.vitals.map((v, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-0">
                              <td className="py-2 text-white font-medium">{v.take || `${i+1}ST`}</td>
                              <td className="py-2 text-white">{v.time || '---'}</td>
                              <td className="py-2 text-white">{v.bp || '---'}</td>
                              <td className="py-2 text-white">{v.pr || '---'}</td>
                              <td className="py-2 text-white">{v.o2 || '---'}</td>
                              <td className="py-2 text-white">{v.rr || '---'}</td>
                              <td className="py-2 text-white">{v.temp || '---'}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td className="py-2 text-white font-medium">1ST</td>
                              <td className="py-2 text-white">---</td>
                              <td className="py-2 text-white">{selectedPcr.pcr_data?.medical?.blood_pressure || '---'}</td>
                              <td className="py-2 text-white">{selectedPcr.pcr_data?.medical?.pulse_rate || '---'}</td>
                              <td className="py-2 text-white">{selectedPcr.pcr_data?.medical?.oxygen || '---'}</td>
                              <td className="py-2 text-white">---</td>
                              <td className="py-2 text-white">{selectedPcr.pcr_data?.medical?.temperature || '---'}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Glasgow Coma Scale</span>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-400">Eye (E):</span> <strong className="text-white">{selectedPcr.pcr_data?.medical?.gcs_eye || '0'}</strong></div>
                      <div className="flex justify-between"><span className="text-gray-400">Verbal (V):</span> <strong className="text-white">{selectedPcr.pcr_data?.medical?.gcs_verbal || '0'}</strong></div>
                      <div className="flex justify-between"><span className="text-gray-400">Motor (M):</span> <strong className="text-white">{selectedPcr.pcr_data?.medical?.gcs_motor || '0'}</strong></div>
                      <div className="flex justify-between pt-1 border-t border-white/10 mt-1"><span className="text-gray-300 font-bold">Total:</span> <strong className="text-[#0a84ff] font-bold text-sm">{(selectedPcr.pcr_data?.medical?.gcs_eye || 0) + (selectedPcr.pcr_data?.medical?.gcs_verbal || 0) + (selectedPcr.pcr_data?.medical?.gcs_motor || 0)}</strong></div>
                    </div>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Chief Complaint</span>
                    <strong className="text-white text-sm" style={{ color: selectedPcr.emergency_type?.color_hex || '#fff' }}>
                      {selectedPcr.emergency_type?.emoji_icon} {selectedPcr.emergency_type?.name || (typeof selectedPcr.emergency_type === 'string' ? selectedPcr.emergency_type : '') || selectedPcr.pcr_data?.personal?.emergency_type || 'Not specified'}
                    </strong>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Transported To</span>
                    <strong className="text-white text-sm">{selectedPcr.pcr_data?.transport?.to || 'Not specified'}</strong>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Assessment / Injuries</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {Object.entries(selectedPcr.pcr_data?.injuries || {}).map(([key, value]) => {
                        if (value === true || value === 'true') {
                          return <span key={key} className="px-2 py-1 bg-[#ef4444]/20 text-[#ef4444] rounded text-xs border border-[#ef4444]/30">{key.replace('_', ' ')}</span>;
                        }
                        return null;
                      })}
                      {selectedPcr.pcr_data?.injuries?.description && (
                        <p className="text-gray-400 text-xs w-full mt-2 italic">"{selectedPcr.pcr_data.injuries.description}"</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-black/20 p-3 rounded-lg border border-white/5 md:col-span-2">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Special Instructions / Treatment</span>
                    <strong className="text-white text-sm">{selectedPcr.pcr_data?.treatment?.notes || 'None'}</strong>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5 md:col-span-2">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Medicines Administered</span>
                    <strong className="text-white text-sm">{selectedPcr.pcr_data?.treatment?.medicines || 'None'}</strong>
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs text-gray-400">
                  <div><strong>Responder:</strong> <span className="text-white">{selectedPcr.pcr_data?.signatures?.responder || 'Not specified'}</span></div>
                  <div><strong>Arrived:</strong> <span className="text-white">{selectedPcr.pcr_data?.transport?.arrival_time || 'Not specified'}</span></div>
                  <div><strong>Transported:</strong> <span className="text-white">{selectedPcr.pcr_data?.signatures?.datetime || 'Not specified'}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
