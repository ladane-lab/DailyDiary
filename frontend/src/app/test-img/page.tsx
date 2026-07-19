import Image from 'next/image';

export default function TestImg() {
  const url = 'http://localhost:5000/uploads/1778480163588-972910066.jpeg';
  return (
    <div>
      <h1>Test Images</h1>
      
      <h2>Next Image (Optimized)</h2>
      <Image src={url} alt='test' width={500} height={300} />
      
      <h2>Next Image (Unoptimized)</h2>
      <Image src={url} alt='test' width={500} height={300} unoptimized={true} />
      
      <h2>Standard Img</h2>
      <img src={url} alt='test' width={500} height={300} />
    </div>
  );
}
