'use client';

import { useState } from 'react';
import { createSupplier, deleteSupplier } from '@/app/supplies/suppliers-actions'; // O ajusta la ruta según donde pongas las acciones

export default function SuppliersDirectory({ initialSuppliers = [] }: { initialSuppliers: any[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    taxId: '',
    address: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createSupplier(form);
    if (res.success) {
      setForm({ name: '', contactName: '', phone: '', email: '', taxId: '', address: '', notes: '' });
      setIsOpen(false);
      window.location.reload(); // Refresca para actualizar datos
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      await deleteSupplier(id);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Directorio de Proveedores y Distribuidoras</h2>
          <p className="text-xs text-slate-400">Gestiona información fiscal, contactos y datos de tus distribuidores.</p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
        >
          {isOpen ? 'Cancelar' : '＋ Nuevo Proveedor'}
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Registrar Distribuidor</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre Comercial / Empresa *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. La Castellana"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre del Agente / Vendedor</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="Ej. Carlos Pérez"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Ej. 33 1234 5678"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ventas@lacastellana.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">RFC / Datos Fiscales / Facturación</label>
              <input
                type="text"
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                placeholder="Ej. CAS850324X12"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Dirección / Sucursal</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ej. Av. Vallarta #1420, Guadalajara"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Notas (Días de entrega, mínimos de compra, etc.)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Ej. Entregas martes y jueves. Pedido mínimo $2,000."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition cursor-pointer"
          >
            Guardar Proveedor
          </button>
        </form>
      )}

      {/* Lista de Proveedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-xl">
            No hay proveedores registrados todavía.
          </div>
        ) : (
          suppliers.map((sup: any) => (
            <div key={sup.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2 relative group">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>🏢</span> {sup.name}
                </h3>
                <button
                  onClick={() => handleDelete(sup.id)}
                  className="text-slate-600 hover:text-rose-400 text-xs transition cursor-pointer"
                  title="Eliminar proveedor"
                >
                  🗑️
                </button>
              </div>

              <div className="text-xs space-y-1 text-slate-300">
                {sup.contactName && <div>👤 **Agente:** {sup.contactName}</div>}
                {sup.phone && <div>📞 **Tel:** {sup.phone}</div>}
                {sup.email && <div>✉️ **Email:** {sup.email}</div>}
                {sup.taxId && <div>📄 **RFC:** <span className="font-mono text-amber-400">{sup.taxId}</span></div>}
                {sup.address && <div>📍 **Dir:** {sup.address}</div>}
                {sup.notes && <div className="text-slate-400 italic pt-1 border-t border-slate-800">💡 {sup.notes}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}