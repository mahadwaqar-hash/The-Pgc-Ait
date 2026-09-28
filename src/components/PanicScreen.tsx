interface PanicScreenProps {
  onDeactivate: () => void;
}

export default function PanicScreen({ onDeactivate }: PanicScreenProps) {
  return (
    <div 
      className="fixed inset-0 z-[100] bg-white cursor-default"
      onClick={onDeactivate}
    >
      <div className="max-w-4xl mx-auto p-12 text-black font-serif">
        <h1 className="text-4xl font-bold mb-8">Chapter 4: Work and Energy</h1>
        
        <div className="space-y-6 text-lg leading-relaxed">
          <p>
            In physics, work is done when a force acts upon an object causing a displacement. 
            The formula for work is given by:
          </p>
          
          <div className="bg-gray-100 p-4 rounded text-center font-mono text-xl">
            W = F × d × cos(θ)
          </div>
          
          <p>
            Where W is work, F is the magnitude of the force, d is the displacement, and θ is the angle between the force vector and the displacement vector.
          </p>
          
          <h2 className="text-2xl font-bold mt-8 mb-4">4.2 Kinetic Energy</h2>
          
          <p>
            Kinetic energy is the energy of motion. An object that has motion - whether it is vertical or horizontal motion - has kinetic energy. The amount of translational kinetic energy that an object has depends upon two variables: the mass (m) of the object and the speed (v) of the object.
          </p>
          
          <div className="bg-gray-100 p-4 rounded text-center font-mono text-xl">
            KE = ½ m v²
          </div>
        </div>
      </div>
    </div>
  );
}
