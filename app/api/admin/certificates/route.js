import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCertificatesCollection, getUsersCollection } from '@/lib/db';
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
    const usersCollection = await getUsersCollection();

    const query = doctorId ? { certificateOfDoctor: doctorId } : {};
    const certificates = await certificatesCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch doctor info for display
    const doctorIds = [...new Set(certificates.map((c) => c.certificateOfDoctor).filter(Boolean))];
    let doctorMap = new Map();
    if (doctorIds.length > 0) {
      const doctors = await usersCollection
        .find(
          { _id: { $in: doctorIds.map((id) => new ObjectId(id)) } },
          { projection: { name: 1, email: 1 } }
        )
        .toArray();
      doctorMap = new Map(doctors.map((d) => [d._id.toString(), { name: d.name, email: d.email }]));
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

