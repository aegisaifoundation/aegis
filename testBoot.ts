import { Bootloader } from '@aegis/runtime';

async function test() {
  console.log('=== Test Bootloader Active ===');
  
  const kernel = await Bootloader.boot();
  console.log(`Kernel version: ${kernel.version}`);
  console.log(`Kernel status: ${kernel.status}`);

  await kernel.shutdown();
  console.log('=== Test Bootloader Terminated ===');
}

test().catch(console.error);
