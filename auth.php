<?php
$s = escapeshellcmd('python3.7 /var/www/spotirec.me/cgi-bin/auth.py --auth ' . escapeshellarg($_GET['code'])) . ' 2>&1';
echo $s;
$output = shell_exec($s);
echo $output;
?>
