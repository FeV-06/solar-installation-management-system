-- Seed 25 realistic leads for testing pagination and search
DO $$
DECLARE
    r RECORD;
    addr_id integer;
    addr_hash text;
    leads_json jsonb := '[
      {"first":"Aarav","last":"Sharma","email":"aarav.sharma@example.com","phone":"+919876543210","street":"45 Mall Road","city":"Amritsar","state":"PB","zip":"143001","type":"House","status":"New","bill":"3000-5000","time":"Morning","hrs":1},
      {"first":"Priya","last":"Patel","email":"priya.patel@example.com","phone":"+919812345678","street":"12 Sector 17","city":"Chandigarh","state":"CH","zip":"160017","type":"House","status":"Contacted","bill":"5000-10000","time":"Afternoon","hrs":2},
      {"first":"Rohan","last":"Verma","email":"rohan.verma@example.com","phone":"+919823456789","street":"88 Civil Lines","city":"Ludhiana","state":"PB","zip":"141001","type":"House","status":"New","bill":"1500-3000","time":"Evening","hrs":3},
      {"first":"Ananya","last":"Iyer","email":"ananya.iyer@example.com","phone":"+919834567890","street":"102 MG Road","city":"Bengaluru","state":"KA","zip":"560001","type":"House","status":"Contacted","bill":"over10000","time":"Morning","hrs":4},
      {"first":"Vikram","last":"Malhotra","email":"vikram.m@example.com","phone":"+919845678901","street":"74 Model Town","city":"Jalandhar","state":"PB","zip":"144003","type":"Commercial","status":"Converted","bill":"over10000","time":"Afternoon","hrs":5},
      {"first":"Sneha","last":"Kulkarni","email":"sneha.k@example.com","phone":"+919856789012","street":"19 FC Road","city":"Pune","state":"MH","zip":"411004","type":"House","status":"New","bill":"3000-5000","time":"Evening","hrs":6},
      {"first":"Kabir","last":"Singh","email":"kabir.singh@example.com","phone":"+919867890123","street":"55 Ranjit Avenue","city":"Amritsar","state":"PB","zip":"143002","type":"House","status":"Disqualified","bill":"under100","time":"Morning","hrs":7},
      {"first":"Meera","last":"Nair","email":"meera.nair@example.com","phone":"+919878901234","street":"23 Marine Drive","city":"Mumbai","state":"MH","zip":"400020","type":"House","status":"Contacted","bill":"5000-10000","time":"Afternoon","hrs":8},
      {"first":"Arjun","last":"Reddy","email":"arjun.reddy@example.com","phone":"+919889012345","street":"9 Jubilee Hills","city":"Hyderabad","state":"TS","zip":"500033","type":"Commercial","status":"New","bill":"over10000","time":"Morning","hrs":9},
      {"first":"Diya","last":"Sen","email":"diya.sen@example.com","phone":"+919890123456","street":"31 Park Street","city":"Kolkata","state":"WB","zip":"700016","type":"House","status":"Converted","bill":"3000-5000","time":"Evening","hrs":10},
      {"first":"Harpreet","last":"Kaur","email":"harpreet.k@example.com","phone":"+919901234567","street":"14 Phase 7","city":"Mohali","state":"PB","zip":"160062","type":"House","status":"New","bill":"5000-10000","time":"Afternoon","hrs":11},
      {"first":"Aditya","last":"Joshi","email":"aditya.joshi@example.com","phone":"+919912345678","street":"62 MI Road","city":"Jaipur","state":"RJ","zip":"302001","type":"House","status":"Lost","bill":"1500-3000","time":"Morning","hrs":12},
      {"first":"Riya","last":"Kapoor","email":"riya.kapoor@example.com","phone":"+919923456789","street":"80 Connaught Place","city":"New Delhi","state":"DL","zip":"110001","type":"Commercial","status":"Contacted","bill":"over10000","time":"Evening","hrs":13},
      {"first":"Karan","last":"Mehta","email":"karan.mehta@example.com","phone":"+919934567890","street":"5 Ashram Road","city":"Ahmedabad","state":"GJ","zip":"380009","type":"House","status":"New","bill":"3000-5000","time":"Afternoon","hrs":14},
      {"first":"Pooja","last":"Das","email":"pooja.das@example.com","phone":"+919945678901","street":"41 GS Road","city":"Guwahati","state":"AS","zip":"781005","type":"House","status":"Contacted","bill":"1500-3000","time":"Morning","hrs":15},
      {"first":"Manpreet","last":"Singh","email":"manpreet.s@example.com","phone":"+919956789012","street":"29 GT Road","city":"Amritsar","state":"PB","zip":"143005","type":"House","status":"Converted","bill":"5000-10000","time":"Evening","hrs":16},
      {"first":"Tanvi","last":"Deshmukh","email":"tanvi.d@example.com","phone":"+919967890123","street":"7 Shivaji Nagar","city":"Nagpur","state":"MH","zip":"440010","type":"House","status":"New","bill":"3000-5000","time":"Morning","hrs":17},
      {"first":"Siddharth","last":"Rao","email":"sid.rao@example.com","phone":"+919978901234","street":"18 Anna Salai","city":"Chennai","state":"TN","zip":"600002","type":"Commercial","status":"Lost","bill":"over10000","time":"Afternoon","hrs":18},
      {"first":"Simran","last":"Bhasin","email":"simran.b@example.com","phone":"+919989012345","street":"93 Urban Estate","city":"Patiala","state":"PB","zip":"147002","type":"House","status":"Contacted","bill":"3000-5000","time":"Evening","hrs":19},
      {"first":"Devendra","last":"Yadav","email":"dev.yadav@example.com","phone":"+919990123456","street":"50 Hazratganj","city":"Lucknow","state":"UP","zip":"226001","type":"House","status":"New","bill":"1500-3000","time":"Morning","hrs":20},
      {"first":"Ishaan","last":"Chatterjee","email":"ishaan.c@example.com","phone":"+919701234567","street":"11 Salt Lake","city":"Kolkata","state":"WB","zip":"700091","type":"House","status":"Disqualified","bill":"under100","time":"Afternoon","hrs":21},
      {"first":"Navneet","last":"Dhillon","email":"navneet.d@example.com","phone":"+919712345678","street":"64 Cantonment","city":"Bathinda","state":"PB","zip":"151001","type":"House","status":"New","bill":"3000-5000","time":"Evening","hrs":22},
      {"first":"Rashmi","last":"Hegde","email":"rashmi.h@example.com","phone":"+919723456789","street":"33 Indiranagar","city":"Bengaluru","state":"KA","zip":"560038","type":"House","status":"Contacted","bill":"5000-10000","time":"Morning","hrs":23},
      {"first":"Gurpreet","last":"Gill","email":"gurpreet.g@example.com","phone":"+919734567890","street":"82 Lawrence Road","city":"Amritsar","state":"PB","zip":"143001","type":"House","status":"Converted","bill":"over10000","time":"Afternoon","hrs":24},
      {"first":"Alok","last":"Mishra","email":"alok.mishra@example.com","phone":"+919745678901","street":"15 Boring Road","city":"Patna","state":"BR","zip":"800001","type":"House","status":"New","bill":"1500-3000","time":"Morning","hrs":25}
    ]';
BEGIN
    FOR r IN SELECT * FROM jsonb_to_recordset(leads_json) AS x(
        "first" text, "last" text, "email" text, "phone" text,
        "street" text, "city" text, "state" text, "zip" text,
        "type" text, "status" text, "bill" text, "time" text, "hrs" int
    )
    LOOP
        addr_hash := upper(encode(sha256((r.street || '|' || r.city || '|' || r.state || '|' || r.zip || '|IN')::bytea), 'hex'));

        INSERT INTO addresses (street, city, state, zip_code, country, unique_address_hash)
        VALUES (r.street, r.city, r.state, r.zip, 'IN', addr_hash)
        ON CONFLICT (unique_address_hash) DO NOTHING;

        SELECT id INTO addr_id FROM addresses WHERE unique_address_hash = addr_hash LIMIT 1;

        IF NOT EXISTS (SELECT 1 FROM leads WHERE email = r.email) THEN
            INSERT INTO leads (
                first_name, last_name, email, phone_number,
                address_id, property_type, is_property_owner,
                status, created_at,
                contacted_at, closed_at,
                monthly_bill_range, best_time_to_contact
            ) VALUES (
                r.first,
                r.last,
                r.email,
                r.phone,
                addr_id,
                r.type,
                true,
                r.status,
                NOW() - (r.hrs * INTERVAL '1 hour'),
                CASE WHEN r.status IN ('Contacted', 'Converted') THEN NOW() - (r.hrs * INTERVAL '45 minute') ELSE NULL END,
                CASE WHEN r.status IN ('Converted', 'Disqualified', 'Lost') THEN NOW() - (r.hrs * INTERVAL '30 minute') ELSE NULL END,
                r.bill,
                r.time
            );
        END IF;
    END LOOP;
END $$;
