import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCertificatesCollection, getUsersCollection, getDoctorsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// GET - admin list/search certificates
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');

    const certificatesCollection = await getCertificatesCollection();
    const doctorsCollection = await getDoctorsCollection();
    const usersCollection = await getUsersCollection();

    const query = doctorId ? { certificateOfDoctor: doctorId } : {};
    const certificates = await certificatesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch doctor info for display (certificateOfDoctor is now doctorId string)
    const doctorIds = [...new Set(certificates.map((c) => c.certificateOfDoctor).filter(Boolean))];
    let doctorMap = new Map();
    if (doctorIds.length > 0) {
      const doctors = await doctorsCollection
        .find({ doctorId: { $in: doctorIds } })
        .toArray();
      
      // Get user info for doctors
      const doctorUserIds = doctors.map(d => d.userId).filter(Boolean).map(id => new ObjectId(id));
      const doctorUsers = await usersCollection
        .find({ _id: { $in: doctorUserIds } }, { projection: { name: 1, email: 1, _id: 1 } })
        .toArray();
      
      const doctorUserMap = new Map(doctorUsers.map(u => [u._id.toString(), u]));
      
      // Map doctorId to doctor info
      doctors.forEach(doc => {
        const userInfo = doctorUserMap.get(doc.userId);
        if (userInfo) {
          doctorMap.set(doc.doctorId, { name: userInfo.name, email: userInfo.email });
        }
      });
    }

    return NextResponse.json({
      certificates: certificates.map((c) => ({
        ...c,
        id: c._id.toString(),
        _id: undefined,
        doctor: doctorMap.get(c.certificateOfDoctor) || null,
      })),
    });
  } catch (error) {
    console.error('Admin certificates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

