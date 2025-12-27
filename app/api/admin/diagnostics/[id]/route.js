import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDiagnosticsCollection } from '@/lib/db';
import { ObjectId } from 'mongodb';

// DELETE - Delete a diagnostic
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const diagnosticsCollection = await getDiagnosticsCollection();

    // Delete the diagnostic
    const result = await diagnosticsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Diagnostic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Diagnostic deleted successfully',
    });
  } catch (error) {
    console.error('Delete diagnostic error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

