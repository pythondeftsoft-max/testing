import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FormGenerationRequest {
  propertyId: string;
  formType: 'w9' | 'direct_deposit' | 'pm_agreement';
  configId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Set auth for user context
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { propertyId, formType, configId }: FormGenerationRequest = await req.json();

    // Validate property ownership
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('owner_id', user.id)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found or unauthorized');
    }

    // Get HAP config data
    const { data: config, error: configError } = await supabase
      .from('hap_payee_configs')
      .select('*')
      .eq('id', configId)
      .eq('property_id', propertyId)
      .single();

    if (configError || !config) {
      throw new Error('HAP configuration not found');
    }

    // Generate the appropriate form
    let formContent: string;
    let fileName: string;
    let documentType: string;

    switch (formType) {
      case 'w9':
        formContent = generateW9Form(config, property);
        fileName = `W9_Form_${property.address.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`;
        documentType = 'hap_w9_form';
        break;
      case 'direct_deposit':
        formContent = generateDirectDepositForm(config, property);
        fileName = `Direct_Deposit_Form_${property.address.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`;
        documentType = 'hap_direct_deposit_form';
        break;
      case 'pm_agreement':
        formContent = generatePMAgreementForm(config, property);
        fileName = `PM_Agreement_${property.address.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`;
        documentType = 'hap_pm_agreement';
        break;
      default:
        throw new Error('Invalid form type');
    }

    // Store the generated form in storage
    const filePath = `${user.id}/${fileName}`;
    const { error: storageError } = await supabase.storage
      .from('property-documents')
      .upload(filePath, new Blob([formContent], { type: 'text/html' }));

    if (storageError) {
      console.error('Storage error:', storageError);
      throw new Error('Failed to store generated form');
    }

    // Store document metadata in database
    const { data: document, error: docError } = await supabase
      .from('property_documents')
      .insert({
        property_id: propertyId,
        uploaded_by: user.id,
        document_type: documentType,
        file_name: fileName,
        file_path: filePath,
        file_size: new Blob([formContent]).size,
        mime_type: 'text/html',
        metadata: {
          form_type: formType,
          config_id: configId,
          generated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (docError) {
      console.error('Document error:', docError);
      throw new Error('Failed to store document metadata');
    }

    // Update HAP config with form URL
    const updateField = formType === 'w9' ? 'w9_form_url' : 
                       formType === 'direct_deposit' ? 'direct_deposit_form_url' : 
                       'pm_agreement_url';

    await supabase
      .from('hap_payee_configs')
      .update({ [updateField]: filePath })
      .eq('id', configId);

    return new Response(
      JSON.stringify({
        success: true,
        document: document,
        downloadUrl: filePath
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating form:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateW9Form(config: any, property: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form W-9 - Request for Taxpayer Identification Number and Certification</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .form-section { margin-bottom: 20px; border: 1px solid #ccc; padding: 15px; }
        .field { margin: 10px 0; }
        .field label { font-weight: bold; margin-right: 10px; }
        .field input { border: none; border-bottom: 1px solid #000; padding: 2px 5px; }
        .checkbox-group { display: flex; gap: 20px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #000; padding: 8px; text-align: left; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Form W-9</h2>
        <h3>Request for Taxpayer Identification Number and Certification</h3>
        <p>(Rev. October 2018) • Department of the Treasury • Internal Revenue Service</p>
    </div>

    <div class="form-section">
        <h4>1. Name (as shown on your income tax return)</h4>
        <div class="field">
            <input type="text" value="${config.payee_name}" style="width: 400px;" readonly>
        </div>
        
        <h4>2. Business name/disregarded entity name, if different from above</h4>
        <div class="field">
            <input type="text" value="${config.payee_type === 'property_manager' ? 'Property Management Services' : ''}" style="width: 400px;" readonly>
        </div>

        <h4>3. Check appropriate box for federal tax classification:</h4>
        <div class="checkbox-group">
            <label><input type="checkbox" ${config.payee_type === 'landlord' ? 'checked' : ''}> Individual/sole proprietor or single-member LLC</label>
            <label><input type="checkbox" ${config.payee_type === 'property_manager' ? 'checked' : ''}> C Corporation</label>
        </div>
        <div class="checkbox-group">
            <label><input type="checkbox"> S Corporation</label>
            <label><input type="checkbox"> Partnership</label>
            <label><input type="checkbox"> Trust/estate</label>
        </div>

        <h4>4. Exemptions</h4>
        <p>Exempt payee code (if any): _____ &nbsp;&nbsp; Exemption from FATCA reporting code (if any): _____</p>

        <h4>5. Address (number, street, and apt. or suite no.)</h4>
        <div class="field">
            <input type="text" value="${property.address}" style="width: 400px;" readonly>
        </div>

        <h4>6. City, state, and ZIP code</h4>
        <div class="field">
            <input type="text" value="${property.city || ''}, ${property.state || ''} ${property.zipcode || ''}" style="width: 300px;" readonly>
        </div>

        <h4>7. List account number(s) here (optional)</h4>
        <div class="field">
            <input type="text" value="${config.bank_name} - ${config.account_type}" style="width: 300px;" readonly>
        </div>
    </div>

    <div class="form-section">
        <h4>Part I - Taxpayer Identification Number (TIN)</h4>
        <p>Enter your TIN in the appropriate box. The TIN provided must match the name given on line 1.</p>
        
        <table>
            <tr>
                <td style="width: 50%;">
                    <strong>Social security number</strong><br>
                    <input type="text" placeholder="XXX-XX-XXXX" style="width: 120px; margin-top: 10px;">
                </td>
                <td style="width: 50%;">
                    <strong>Employer identification number</strong><br>
                    <input type="text" placeholder="XX-XXXXXXX" style="width: 120px; margin-top: 10px;">
                </td>
            </tr>
        </table>
    </div>

    <div class="form-section">
        <h4>Part II - Certification</h4>
        <p>Under penalties of perjury, I certify that:</p>
        <ol>
            <li>The number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued to me);</li>
            <li>I am not subject to backup withholding because: (a) I am exempt from backup withholding, or (b) I have not been notified by the Internal Revenue Service (IRS) that I am subject to backup withholding;</li>
            <li>I am a U.S. citizen or other U.S. person;</li>
            <li>The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.</li>
        </ol>
        
        <div style="margin-top: 30px;">
            <p><strong>Sign Here:</strong></p>
            <div style="border-bottom: 1px solid #000; width: 300px; height: 40px; display: inline-block; margin-right: 50px;"></div>
            <div style="border-bottom: 1px solid #000; width: 150px; height: 40px; display: inline-block;"></div>
            <br>
            <small>Signature of U.S. person &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Date</small>
        </div>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #666;">
        Generated on: ${new Date().toLocaleDateString()}<br>
        Property: ${property.address}<br>
        Payee: ${config.payee_name}
    </p>
</body>
</html>`;
}

function generateDirectDepositForm(config: any, property: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Direct Deposit Authorization Form</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .form-section { margin-bottom: 25px; padding: 15px; border: 1px solid #ccc; }
        .field { margin: 15px 0; }
        .field label { font-weight: bold; display: inline-block; width: 200px; }
        .field input { border: none; border-bottom: 1px solid #000; padding: 5px; width: 250px; }
        .readonly { background-color: #f0f0f0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        td, th { border: 1px solid #000; padding: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>DIRECT DEPOSIT AUTHORIZATION FORM</h2>
        <h3>Housing Assistance Payment (HAP) Program</h3>
    </div>

    <div class="form-section">
        <h4>PAYEE INFORMATION</h4>
        <div class="field">
            <label>Payee Name:</label>
            <input type="text" value="${config.payee_name}" class="readonly" readonly>
        </div>
        <div class="field">
            <label>Payee Type:</label>
            <input type="text" value="${config.payee_type === 'landlord' ? 'Property Owner/Landlord' : 'Property Manager'}" class="readonly" readonly>
        </div>
        <div class="field">
            <label>Property Address:</label>
            <input type="text" value="${property.address}" class="readonly" readonly>
        </div>
        <div class="field">
            <label>City, State, ZIP:</label>
            <input type="text" value="${property.city || ''}, ${property.state || ''} ${property.zipcode || ''}" class="readonly" readonly>
        </div>
    </div>

    <div class="form-section">
        <h4>BANKING INFORMATION</h4>
        <div class="field">
            <label>Bank Name:</label>
            <input type="text" value="${config.bank_name}" class="readonly" readonly>
        </div>
        <div class="field">
            <label>Account Type:</label>
            <input type="text" value="${config.account_type.charAt(0).toUpperCase() + config.account_type.slice(1)}" class="readonly" readonly>
        </div>
        <div class="field">
            <label>Routing Number:</label>
            <input type="text" value="${config.routing_number}" class="readonly" readonly>
        </div>
        <div class="field">
            <label>Account Number:</label>
            <input type="text" value="****${config.account_number_encrypted ? config.account_number_encrypted.slice(-4) : 'XXXX'}" class="readonly" readonly>
        </div>
    </div>

    <div class="form-section">
        <h4>AUTHORIZATION</h4>
        <p>I hereby authorize the Public Housing Authority to initiate credit entries to my account indicated above and the financial institution named above to credit the same to such account.</p>
        
        <p>This authority is to remain in full force and effect until the Public Housing Authority has received written notification from me of its termination in such time and in such manner as to afford the Public Housing Authority and the financial institution a reasonable opportunity to act on it.</p>
        
        <table style="margin-top: 30px;">
            <tr>
                <td style="width: 60%;"><strong>Authorized Signature</strong><br><br><br></td>
                <td style="width: 40%;"><strong>Date</strong><br><br><br></td>
            </tr>
            <tr>
                <td><strong>Print Name</strong><br><br><br></td>
                <td><strong>Phone Number</strong><br><br><br></td>
            </tr>
        </table>
    </div>

    <div class="form-section">
        <h4>BANK VERIFICATION (To be completed by Financial Institution)</h4>
        <table>
            <tr>
                <td style="width: 50%;"><strong>Bank Official Signature</strong><br><br><br></td>
                <td style="width: 50%;"><strong>Date</strong><br><br><br></td>
            </tr>
            <tr>
                <td><strong>Print Name & Title</strong><br><br><br></td>
                <td><strong>Bank Phone Number</strong><br><br><br></td>
            </tr>
        </table>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 15px;">
        <strong>Important Notes:</strong><br>
        • Please attach a voided check or bank verification letter<br>
        • This form must be completed and returned before HAP payments can be processed<br>
        • Any changes to banking information require a new authorization form<br><br>
        Generated on: ${new Date().toLocaleDateString()}<br>
        Property: ${property.address}
    </p>
</body>
</html>`;
}

function generatePMAgreementForm(config: any, property: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Property Management Agreement</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .section { margin-bottom: 25px; }
        .field { display: inline-block; border-bottom: 1px solid #000; min-width: 200px; padding: 2px 5px; }
        .signature-section { margin-top: 40px; }
        .signature-block { display: inline-block; width: 45%; margin: 20px 2%; vertical-align: top; }
        .signature-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; }
        ol, ul { padding-left: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>PROPERTY MANAGEMENT AGREEMENT</h2>
        <h3>Housing Assistance Payment (HAP) Program</h3>
    </div>

    <div class="section">
        <p>This Property Management Agreement ("Agreement") is entered into on <span class="field">${new Date().toLocaleDateString()}</span>, between:</p>
        
        <p><strong>PROPERTY OWNER:</strong> <span class="field">${config.payee_name}</span> ("Owner")</p>
        <p><strong>PROPERTY MANAGER:</strong> <span class="field">[Property Manager Name]</span> ("Manager")</p>
        <p><strong>PROPERTY ADDRESS:</strong> <span class="field">${property.address}, ${property.city || ''}, ${property.state || ''} ${property.zipcode || ''}</span></p>
    </div>

    <div class="section">
        <h4>1. APPOINTMENT</h4>
        <p>Owner hereby appoints Manager as the exclusive agent to lease, operate, manage, and maintain the above-described property in accordance with this Agreement.</p>
    </div>

    <div class="section">
        <h4>2. MANAGER'S RESPONSIBILITIES</h4>
        <p>Manager agrees to:</p>
        <ul>
            <li>Collect all rents and Housing Assistance Payments (HAP) on behalf of Owner</li>
            <li>Maintain property in compliance with Housing Quality Standards (HQS)</li>
            <li>Coordinate inspections with the Public Housing Authority</li>
            <li>Handle tenant relations and lease enforcement</li>
            <li>Maintain detailed financial records and provide monthly statements</li>
            <li>Coordinate necessary repairs and maintenance</li>
            <li>Ensure compliance with all applicable housing regulations</li>
        </ul>
    </div>

    <div class="section">
        <h4>3. COMPENSATION</h4>
        <p>As compensation for services, Manager shall receive:</p>
        <ul>
            <li>Management fee of <span class="field">____%</span> of gross rental income collected</li>
            <li>Leasing fee of <span class="field">$____</span> for each new tenant placement</li>
            <li>Markup of <span class="field">____%</span> on maintenance and repair costs (if applicable)</li>
        </ul>
    </div>

    <div class="section">
        <h4>4. HAP PAYMENT PROCESSING</h4>
        <p>Manager is authorized to:</p>
        <ul>
            <li>Receive HAP payments directly from the Public Housing Authority</li>
            <li>Deposit HAP payments into the designated trust account</li>
            <li>Distribute net proceeds to Owner according to the agreed schedule</li>
            <li>Maintain separate accounting for HAP and tenant portion payments</li>
        </ul>
    </div>

    <div class="section">
        <h4>5. BANKING AUTHORIZATION</h4>
        <p>Owner authorizes Manager to process HAP payments through the following account:</p>
        <p><strong>Bank:</strong> <span class="field">${config.bank_name}</span></p>
        <p><strong>Account Type:</strong> <span class="field">${config.account_type}</span></p>
        <p><strong>Routing Number:</strong> <span class="field">${config.routing_number}</span></p>
    </div>

    <div class="section">
        <h4>6. TERM AND TERMINATION</h4>
        <p>This Agreement shall commence on <span class="field">[Start Date]</span> and continue until terminated by either party with thirty (30) days written notice.</p>
    </div>

    <div class="section">
        <h4>7. INSURANCE AND LIABILITY</h4>
        <p>Manager shall maintain professional liability insurance with minimum coverage of $1,000,000. Owner shall maintain property insurance covering the premises.</p>
    </div>

    <div class="signature-section">
        <div class="signature-block">
            <h4>PROPERTY OWNER</h4>
            <div class="signature-line"></div>
            <p><strong>Signature:</strong> ${config.payee_name}</p>
            <div class="signature-line"></div>
            <p><strong>Date:</strong></p>
            <div class="signature-line"></div>
            <p><strong>Print Name:</strong></p>
        </div>

        <div class="signature-block">
            <h4>PROPERTY MANAGER</h4>
            <div class="signature-line"></div>
            <p><strong>Signature:</strong></p>
            <div class="signature-line"></div>
            <p><strong>Date:</strong></p>
            <div class="signature-line"></div>
            <p><strong>Print Name:</strong></p>
        </div>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 15px;">
        Generated on: ${new Date().toLocaleDateString()}<br>
        Property: ${property.address}<br>
        This agreement is subject to all applicable federal, state, and local laws.
    </p>
</body>
</html>`;
}